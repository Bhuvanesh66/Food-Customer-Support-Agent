import { Router } from 'express';
import { z } from 'zod';
import { openSSE, sendSSE, heartbeat } from '../util/sse.js';
import { runAgentTurn, type AgentEvent } from '../agent/loop.js';
import { getConversation } from '../db/repo/conversations.js';

export const chatRouter = Router();

const Body = z.object({
  conversationId: z.string().min(1),
  // Allow an empty message when an image is attached (image-only complaints).
  message: z.string().max(4000).default(''),
  // Optional complaint photo (base64, no data: prefix) + mime type.
  image: z
    .object({
      data: z.string().min(1),
      mimeType: z.string().min(1),
    })
    .optional(),
});

chatRouter.post('/', async (req, res) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'conversationId is required.' });
  }
  const { conversationId, message, image } = parsed.data;
  if (!message.trim() && !image) {
    return res.status(400).json({ error: 'Provide a message or an image.' });
  }

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
    await runAgentTurn(conversationId, message, emit, image);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Agent error';
    emit({ type: 'error', message: msg });
  } finally {
    clearInterval(hb);
    if (!res.writableEnded) res.end();
  }
});
