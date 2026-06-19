import { env } from '../config/env.js';
import { callWithFailover } from '../providers/registry.js';
import type { ChatMessage as LLMMessage } from '../providers/types.js';
import { systemPrompt, PROTOCOL_REPAIR } from './prompts.js';
import { parseAction, type Sentiment, type Urgency } from './toolProtocol.js';
import { getTool, type ToolContext } from './tools/index.js';
import { decideConfidence, urgencyBoost } from './confidence.js';
import { retrieve, type RetrievedChunk } from '../rag/retrieve.js';
import { analyzeComplaintImage } from '../vision/analyzeImage.js';
import { listMessages, addMessage } from '../db/repo/messages.js';
import { createEscalation } from '../db/repo/escalations.js';
import { setConversationStatus } from '../db/repo/conversations.js';
import { track } from '../analytics/track.js';
import { countTokens } from '../util/tokens.js';
import type { HandoffSummary, Source } from '../types.js';

const HISTORY_TOKEN_BUDGET = 3000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type AgentEvent =
  | { type: 'state'; state: string; detail?: string }
  | { type: 'token'; delta: string }
  | { type: 'sources'; sources: Source[] }
  | { type: 'confidence'; confidence: number }
  | { type: 'sentiment'; sentiment: Sentiment; urgency: Urgency }
  | { type: 'final'; text: string; confidence: number; provider: string; model: string; messageId: string; sources: Source[] }
  | { type: 'escalated'; escalationId: string; reason: string; summary: HandoffSummary; messageId: string }
  | { type: 'error'; message: string };

export type AgentEmit = (ev: AgentEvent) => void;

/** Build the LLM message array from stored history, trimmed to a token budget. */
function buildHistory(conversationId: string): LLMMessage[] {
  const stored = listMessages(conversationId);
  const mapped: LLMMessage[] = [];
  for (const m of stored) {
    if (m.role === 'user') mapped.push({ role: 'user', content: m.content });
    else if (m.role === 'assistant') mapped.push({ role: 'assistant', content: m.content });
    else if (m.role === 'tool')
      mapped.push({ role: 'user', content: `[tool:${m.tool_name}] ${m.content}` });
    // system / human_agent messages are not replayed to the model
  }
  // Keep the most recent messages within budget.
  let budget = HISTORY_TOKEN_BUDGET;
  const kept: LLMMessage[] = [];
  for (let i = mapped.length - 1; i >= 0; i--) {
    const t = countTokens(mapped[i].content);
    if (budget - t < 0 && kept.length > 0) break;
    budget -= t;
    kept.unshift(mapped[i]);
  }
  return kept;
}

function sourcesFrom(chunks: RetrievedChunk[]): Source[] {
  // Dedupe by document, keep highest score.
  const byDoc = new Map<string, Source>();
  for (const c of chunks) {
    const existing = byDoc.get(c.documentId);
    if (!existing || c.score > existing.score) {
      byDoc.set(c.documentId, { documentId: c.documentId, title: c.title, score: c.score });
    }
  }
  return [...byDoc.values()].sort((a, b) => b.score - a.score);
}

/**
 * Run one full agent turn for a user message:
 *  - persist the user message
 *  - pre-retrieve KB context
 *  - reasoning loop (tools) via provider rotation
 *  - confidence + escalation decision
 *  - persist + emit the result
 */
export async function runAgentTurn(
  conversationId: string,
  userMessage: string,
  emit: AgentEmit,
  image?: { data: string; mimeType: string },
): Promise<void> {
  // Record the user turn (note attached image so it shows in history).
  addMessage({
    conversationId,
    role: 'user',
    content: userMessage || (image ? '[sent a photo of the issue]' : ''),
  });
  track('query_received', { conversationId });

  const ctx: ToolContext = { conversationId, collectedSources: [] };

  // ── Vision pre-step: if a complaint photo was attached, analyze it first and
  // inject the structured assessment so the agent drafts a resolution / ticket.
  let imageAnalysisBlock = '';
  if (image) {
    emit({ type: 'state', state: 'retrieving', detail: 'Looking at your photo' });
    try {
      const analysis = await analyzeComplaintImage(image.data, image.mimeType, userMessage);
      imageAnalysisBlock =
        `[image_analysis] The customer attached a photo. Vision assessment:\n` +
        `issue: ${analysis.issue}\nseverity: ${analysis.severity}\n` +
        `itemsAffected: ${analysis.itemsAffected.join(', ') || 'unspecified'}\n` +
        `suggestedResolution: ${analysis.suggestedResolution}\n` +
        `foodRelated: ${analysis.isFoodRelated}\n` +
        `Use this to acknowledge the problem, propose the resolution, and create a ticket if warranted.`;
      track('tool_called', { conversationId, meta: { tool: 'vision_analysis', severity: analysis.severity } });
    } catch (err) {
      imageAnalysisBlock = `[image_analysis] Could not analyze the attached photo (${err instanceof Error ? err.message : 'error'}). Ask the customer to describe the issue.`;
    }
  }

  // Pre-retrieve so we always have a retrieval signal even if the model forgets the tool.
  emit({ type: 'state', state: 'retrieving', detail: 'Searching the knowledge base' });
  const retrievalQuery = userMessage || 'order food quality problem refund complaint';
  const pre = await retrieve(retrievalQuery, 8);
  ctx.collectedSources.push(...pre.chunks);
  if (pre.chunks.length > 0) {
    emit({ type: 'sources', sources: sourcesFrom(pre.chunks) });
  }

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt() },
    ...buildHistory(conversationId),
  ];
  if (imageAnalysisBlock) {
    messages.push({ role: 'user', content: imageAnalysisBlock });
  }
  // Inject the pre-retrieved context as a tool observation.
  if (pre.chunks.length > 0) {
    const ctxBlock = pre.chunks
      .map((c, i) => `[${i + 1}] (source: "${c.title}", relevance ${c.score.toFixed(2)})\n${c.content}`)
      .join('\n\n---\n\n');
    messages.push({
      role: 'user',
      content: `[knowledge_base_search results for the latest question]\n${ctxBlock}`,
    });
  }

  emit({ type: 'state', state: 'thinking', detail: 'Reasoning' });

  let lastProvider = '';
  let lastModel = '';
  let selfConfidence = 0.5;
  let answerable = true;
  let finalText = '';
  let topic: string | undefined;
  let sentiment: Sentiment = 'neutral';
  let urgency: Urgency = 'normal';
  let resolved = false;

  const maxIter = env.agent.maxIterations;
  let exhaustionRetries = 0;
  for (let iter = 0; iter < maxIter; iter++) {
    let result;
    try {
      // No forced jsonMode: the prompt mandates JSON and the parser is tolerant,
      // which avoids provider-specific response_format incompatibilities (some
      // free NVIDIA/OpenRouter models reject it).
      result = await callWithFailover(
        { messages, temperature: 0.2 },
        { needsTools: false },
      );
    } catch (err) {
      // Transient exhaustion (all providers momentarily cooling/rate-limited)
      // usually clears within a couple of seconds — retry once before escalating.
      if (exhaustionRetries < 2) {
        exhaustionRetries++;
        await sleep(1500 * exhaustionRetries);
        iter--; // don't consume a reasoning iteration on an infra retry
        continue;
      }
      emit({ type: 'error', message: 'All AI providers are busy right now.' });
      await escalate(conversationId, ctx, userMessage, 'tool_escalate', 'AI providers unavailable.', 0.0, emit, finalText);
      return;
    }
    lastProvider = result.provider;
    lastModel = result.model;

    const action = parseAction(result.text);

    if (action.kind === 'unparseable') {
      messages.push({ role: 'assistant', content: result.text });
      messages.push({ role: 'user', content: PROTOCOL_REPAIR });
      continue;
    }

    if (action.kind === 'final') {
      finalText = action.final;
      selfConfidence = action.confidence;
      answerable = action.answerable;
      topic = action.topic;
      sentiment = action.sentiment;
      urgency = action.urgency;
      resolved = true;
      break;
    }

    // Tool call
    const tool = getTool(action.tool);
    messages.push({ role: 'assistant', content: result.text });
    if (!tool) {
      messages.push({
        role: 'user',
        content: `[tool:error] Unknown tool "${action.tool}". Available: knowledge_base_search, check_order_status, create_ticket, escalate_to_human.`,
      });
      continue;
    }

    emit({ type: 'state', state: 'retrieving', detail: `Using ${tool.name}` });
    const obs = await tool.run(action.args, ctx);
    addMessage({
      conversationId,
      role: 'tool',
      content: obs.observation,
      toolName: tool.name,
      toolPayload: action.args,
    });
    messages.push({ role: 'user', content: `[tool:${tool.name}] ${obs.observation}` });

    if (ctx.escalation) {
      // Model explicitly escalated.
      const conf = decideConfidence({
        retrievalScore: bestScore(ctx.collectedSources),
        selfAssessment: 0.3,
        answerable: false,
      });
      await escalate(
        conversationId,
        ctx,
        userMessage,
        'tool_escalate',
        ctx.escalation.summary || finalText,
        conf.combined,
        emit,
        finalText,
      );
      return;
    }

    if (ctx.collectedSources.length > 0) {
      emit({ type: 'sources', sources: sourcesFrom(ctx.collectedSources) });
    }
    emit({ type: 'state', state: 'thinking', detail: 'Reasoning' });
  }

  const retrievalScore = bestScore(ctx.collectedSources);

  if (!resolved) {
    // Hit the iteration cap without a final answer → escalate.
    await escalate(
      conversationId,
      ctx,
      userMessage,
      'low_confidence',
      'The agent could not converge on an answer within the reasoning budget.',
      decideConfidence({ retrievalScore, selfAssessment: 0.2, answerable: false }).combined,
      emit,
      finalText,
    );
    return;
  }

  const boost = urgencyBoost(sentiment, urgency);
  const decision = decideConfidence({
    retrievalScore,
    selfAssessment: selfConfidence,
    answerable,
    urgencyBoost: boost,
  });
  emit({ type: 'confidence', confidence: decision.combined });
  emit({ type: 'sentiment', sentiment, urgency });

  if (decision.shouldEscalate) {
    await escalate(
      conversationId,
      ctx,
      userMessage,
      decision.reason === 'out_of_scope' ? 'out_of_scope' : 'low_confidence',
      finalText || 'Low-confidence response withheld.',
      decision.combined,
      emit,
      finalText,
      topic,
      sentiment,
    );
    return;
  }

  // Confident answer — persist + emit.
  const sources = sourcesFrom(ctx.collectedSources);
  const msg = addMessage({
    conversationId,
    role: 'assistant',
    content: finalText,
    confidence: decision.combined,
    provider: lastProvider,
    model: lastModel,
    sources,
  });
  const answeredTopic = topic || inferTopic(userMessage);
  track('ai_answered', { conversationId, topic: answeredTopic, provider: lastProvider, meta: { confidence: decision.combined } });

  // Typewriter stream the answer for a live feel (the agent reasons non-streamed
  // across providers, then we stream the resolved text token-by-token).
  emit({ type: 'state', state: 'answering', detail: 'Responding' });
  await streamText(finalText, emit);

  emit({
    type: 'final',
    text: finalText,
    confidence: decision.combined,
    provider: lastProvider,
    model: lastModel,
    messageId: msg.id,
    sources,
  });
}

/** Emit the answer as word-chunked token events for a streaming UI feel. */
async function streamText(text: string, emit: AgentEmit): Promise<void> {
  const tokens = text.match(/\S+\s*/g) ?? [text];
  for (const t of tokens) {
    emit({ type: 'token', delta: t });
    await sleep(18);
  }
}

function bestScore(chunks: RetrievedChunk[]): number {
  return chunks.reduce((m, c) => Math.max(m, c.score), 0);
}

/** Build the structured handoff summary, persist the escalation, emit. */
/** Infer a coarse topic from the query so escalation analytics aren't all "general". */
function inferTopic(text: string): string {
  const t = text.toLowerCase();
  if (/refund|charge|payment|pay|card|price|cost|bill|promo|fee|tip|gift card/.test(t)) return 'payments';
  if (/deliver|courier|driver|late|arriv|track|address|dropp|never came|where is/.test(t)) return 'delivery';
  if (/order|cancel|missing|wrong|cold|item|reorder|schedule/.test(t)) return 'orders';
  if (/password|login|sign in|account|2fa|email|phone|delete|security|device/.test(t)) return 'account';
  if (/restaurant|menu|dish|allerg|vegan|cuisine|grocery|open|closed/.test(t)) return 'restaurants';
  if (/plus|membership|subscri/.test(t)) return 'membership';
  return 'general';
}

async function escalate(
  conversationId: string,
  ctx: ToolContext,
  userMessage: string,
  reason: 'low_confidence' | 'out_of_scope' | 'tool_escalate' | 'user_request',
  attemptedAnswer: string,
  confidence: number,
  emit: AgentEmit,
  fallbackAnswer: string,
  topic?: string,
  sentiment: Sentiment = 'neutral',
  urgency: Urgency = 'normal',
): Promise<void> {
  // Fall back to keyword inference when the model didn't supply a topic.
  topic = topic || inferTopic(userMessage);
  emit({ type: 'sentiment', sentiment, urgency });
  emit({ type: 'state', state: 'escalating', detail: 'Connecting you with a human agent' });

  const sources = sourcesFrom(ctx.collectedSources);
  const history = listMessages(conversationId);
  const conversationSummary = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Customer' : 'AI'}: ${m.content}`)
    .join('\n');

  const summary: HandoffSummary = {
    userIssue: userMessage,
    conversationSummary,
    attemptedAnswer: attemptedAnswer || fallbackAnswer || '(no answer attempted)',
    retrievedSources: sources,
    confidence,
    suggestedNextSteps: [
      'Review the customer issue and conversation summary above.',
      sources.length
        ? 'Consult the cited knowledge base sources for context.'
        : 'No strong knowledge base match — this may be a gap to document.',
      'Respond to the customer and resolve, or create/assign a ticket.',
    ],
    sentiment,
    urgency,
  };

  const esc = createEscalation({
    conversationId,
    reason,
    topic: topic ?? null,
    handoffSummary: summary,
    confidence,
  });
  setConversationStatus(conversationId, 'awaiting_human');

  const handoffText =
    "I want to make sure you get the best help here, so I'm connecting you with a human support agent. " +
    "They'll have the full context of our conversation — no need to repeat yourself.";
  const msg = addMessage({
    conversationId,
    role: 'assistant',
    content: handoffText,
    confidence,
  });

  track('escalated', { conversationId, topic, meta: { reason, confidence } });
  track('unanswered', { conversationId, topic, meta: { query: userMessage } });

  emit({ type: 'escalated', escalationId: esc.id, reason, summary, messageId: msg.id });
}
