import { Router } from 'express';
import { z } from 'zod';
import {
  addFeedback,
  listQueuedFeedback,
  markFeedbackReviewed,
  addSatisfaction,
  listSatisfaction,
  markSatisfactionReviewed,
} from '../db/repo/feedback.js';
import { getMessage } from '../db/repo/messages.js';
import { track } from '../analytics/track.js';

export const feedbackRouter = Router();

const Body = z.object({
  messageId: z.string().min(1),
  rating: z.union([z.literal(1), z.literal(-1)]),
  comment: z.string().max(1000).optional(),
});

// Per-message 👍/👎 feedback
feedbackRouter.post('/', (req, res) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'messageId and rating (1|-1) required.' });

  const msg = getMessage(parsed.data.messageId);
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  const fb = addFeedback(parsed.data);
  track(parsed.data.rating > 0 ? 'feedback_positive' : 'feedback_negative', {
    conversationId: msg.conversation_id,
  });
  res.json(fb);
});

// Negative-feedback review queue (joined with the offending message)
feedbackRouter.get('/queue', (_req, res) => {
  res.json(listQueuedFeedback());
});

// ── Conversation satisfaction (CSAT 1–5) ──

const Csat = z.object({
  conversationId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

feedbackRouter.post('/satisfaction', (req, res) => {
  const parsed = Csat.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'rating (1–5) required.' });
  const row = addSatisfaction(parsed.data);
  // Reuse the feedback analytics buckets: low scores count as negative signal.
  track(parsed.data.rating >= 4 ? 'feedback_positive' : 'feedback_negative', {
    conversationId: parsed.data.conversationId ?? null,
    meta: { csat: parsed.data.rating, kind: 'satisfaction' },
  });
  res.json(row);
});

feedbackRouter.get('/satisfaction', (_req, res) => {
  res.json(listSatisfaction());
});

feedbackRouter.post('/satisfaction/:id/reviewed', (req, res) => {
  markSatisfactionReviewed(req.params.id);
  res.json({ ok: true });
});

// Mark a queued message-feedback item reviewed
feedbackRouter.post('/:id/reviewed', (req, res) => {
  markFeedbackReviewed(req.params.id);
  res.json({ ok: true });
});
