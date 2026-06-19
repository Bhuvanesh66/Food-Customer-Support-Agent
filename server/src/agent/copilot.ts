import { callWithFailover } from '../providers/registry.js';
import { extractJsonObject } from './toolProtocol.js';
import type { HandoffSummary } from '../types.js';

/**
 * AI Copilot for human agents: given the structured handoff summary, draft 2–3
 * ready-to-send replies the human can pick from. Turns the handoff from a
 * passive summary into an active assistant (Intercom Fin Copilot style).
 */
export async function suggestReplies(summary: HandoffSummary): Promise<string[]> {
  const sources = (summary.retrievedSources ?? [])
    .map((s) => s.title)
    .filter(Boolean)
    .join(', ');

  const prompt = `You are an AI copilot helping a HUMAN support agent at "FoodAssist AI" (food
delivery). A conversation was escalated. Draft 2-3 distinct, ready-to-send replies the human agent
could send the customer to resolve or advance the issue. Be concrete, empathetic, and policy-aware.

Customer issue: ${summary.userIssue}
Detected sentiment: ${summary.sentiment ?? 'neutral'} | urgency: ${summary.urgency ?? 'normal'}
What the AI already tried: ${summary.attemptedAnswer}
Conversation so far:
${summary.conversationSummary}
Relevant knowledge base docs: ${sources || 'none'}

Reply with EXACTLY ONE JSON object, no prose, no fences:
{"replies": ["<reply 1>", "<reply 2>", "<reply 3>"]}
Each reply is a complete message to the customer (1-3 sentences). Vary the approach (e.g. apologize
+ refund, ask a clarifying question, offer a replacement).`;

  try {
    const res = await callWithFailover(
      { messages: [{ role: 'user', content: prompt }], temperature: 0.4 },
      { needsTools: false },
    );
    const json = extractJsonObject(res.text);
    if (json) {
      const o = JSON.parse(json) as { replies?: unknown };
      if (Array.isArray(o.replies)) {
        return o.replies.map(String).filter((r) => r.trim().length > 0).slice(0, 3);
      }
    }
  } catch {
    /* fall through to defaults */
  }
  // Safe fallback so the panel always shows something useful.
  return [
    `I'm really sorry for the trouble with your order. I've reviewed the details and I'll make this right for you right away.`,
    `Thanks for your patience — could you confirm your order ID so I can pull up the exact details and resolve this?`,
  ];
}
