import { getDb } from '../client.js';
import { newId, now } from '../../util/id.js';
import type { Feedback } from '../../types.js';

export function addFeedback(input: {
  messageId: string;
  rating: 1 | -1;
  comment?: string | null;
}): Feedback {
  const db = getDb();
  const id = newId('fb');
  // Negative feedback queues the answer for KB review.
  const reviewStatus = input.rating < 0 ? 'queued' : 'none';
  db.prepare(
    `INSERT INTO feedback (id, message_id, rating, comment, review_status, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, input.messageId, input.rating, input.comment ?? null, reviewStatus, now());
  return getDb().prepare('SELECT * FROM feedback WHERE id = ?').get(id) as Feedback;
}

/** Negative feedback awaiting KB review, joined with the offending message. */
export function listQueuedFeedback(): Array<
  Feedback & {
    message_content: string;
    conversation_id: string;
    sources: string | null;
  }
> {
  return getDb()
    .prepare(
      `SELECT f.*, m.content AS message_content, m.conversation_id, m.sources
         FROM feedback f
         JOIN messages m ON m.id = f.message_id
        WHERE f.review_status = 'queued'
        ORDER BY f.created_at DESC`,
    )
    .all() as never;
}

export function markFeedbackReviewed(id: string): void {
  getDb()
    .prepare(`UPDATE feedback SET review_status = 'reviewed' WHERE id = ?`)
    .run(id);
}

// ── Conversation-level satisfaction (CSAT 1–5) ──

export function addSatisfaction(input: {
  conversationId?: string | null;
  rating: number; // 1..5
  comment?: string | null;
}) {
  const db = getDb();
  const id = newId('csat');
  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  // Low scores (1–2) queue for review so the team can find service gaps.
  const reviewStatus = rating <= 2 ? 'queued' : 'none';
  db.prepare(
    `INSERT INTO satisfaction (id, conversation_id, rating, comment, review_status, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, input.conversationId ?? null, rating, input.comment ?? null, reviewStatus, now());
  return db.prepare('SELECT * FROM satisfaction WHERE id = ?').get(id);
}

/** Recent satisfaction responses for the review page (newest first). */
export function listSatisfaction(limit = 50) {
  return getDb()
    .prepare('SELECT * FROM satisfaction ORDER BY created_at DESC LIMIT ?')
    .all(limit) as Array<{
    id: string;
    conversation_id: string | null;
    rating: number;
    comment: string | null;
    review_status: string;
    created_at: number;
  }>;
}

export function markSatisfactionReviewed(id: string): void {
  getDb().prepare(`UPDATE satisfaction SET review_status = 'reviewed' WHERE id = ?`).run(id);
}

/** Average CSAT + count, for analytics. */
export function satisfactionStats(): { avg: number; count: number } {
  const row = getDb()
    .prepare('SELECT AVG(rating) AS avg, COUNT(*) AS count FROM satisfaction')
    .get() as { avg: number | null; count: number };
  return { avg: row.avg ?? 0, count: row.count };
}
