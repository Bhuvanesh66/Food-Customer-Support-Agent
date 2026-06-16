import { Router } from 'express';
import { z } from 'zod';
import { openSSE, sendSSE, heartbeat } from '../util/sse.js';
import { runAgentTurn, type AgentEvent } from '../agent/loop.js';
import { getConversation } from '../db/repo/conversations.js';

export const chatRouter = Router();

const Body = z.object({
  conversationId: z.string().min(1),
  message: z.string().min(1).max(4000),
});

chatRouter.post('/', async (req, res) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'conversationId and message are required.' });
  }
  const { conversationId, message } = parsed.data;

  const conv = getConversation(conversationId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found.' });
  if (conv.status === 'human') {
    return res.status(409).json({ error: 'Conversation is being handled by a human agent.' });
  }

  openSSE(res);
  // Frequent heartbeat: keeps the stream from going silent long enough to trip
  // strict client body timeouts (e.g. undici's 5s) during long LLM calls.
  const hb = setInterval(() => heartbeat(res), 3000);
  // Use 'aborted' (true client disconnect) rather than 'close' — on Node/Express
  // 'close' also fires after a normal res.end(), and on some platforms early, so
  // gating writes on it can silently swallow the whole stream.
  let aborted = false;
  req.on('aborted', () => {
    aborted = true;
    clearInterval(hb);
  });

  const emit = (ev: AgentEvent) => {
    if (!aborted && !res.writableEnded) sendSSE(res, ev);
  };

  try {
    await runAgentTurn(conversationId, message, emit);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Agent error';
    emit({ type: 'error', message: msg });
  } finally {
    clearInterval(hb);
    if (!res.writableEnded) res.end();
  }
});
