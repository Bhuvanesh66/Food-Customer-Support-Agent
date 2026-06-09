import { getDb } from '../client.js';
import { newId, now } from '../../util/id.js';
import type {
  Escalation,
  EscalationReason,
  EscalationStatus,
  HandoffSummary,
} from '../../types.js';

export function createEscalation(input: {
  conversationId: string;
  reason: EscalationReason;
  topic?: string | null;
  handoffSummary: HandoffSummary;
  confidence?: number | null;
}): Escalation {
  const db = getDb();
  const id = newId('esc');
  db.prepare(
    `INSERT INTO escalations
       (id, conversation_id, reason, topic, handoff_summary, confidence, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`,
  ).run(
    id,
    input.conversationId,
    input.reason,
    input.topic ?? null,
    JSON.stringify(input.handoffSummary),
    input.confidence ?? null,
    now(),
  );
  return getEscalation(id)!;
}

export function getEscalation(id: string): Escalation | undefined {
  return getDb().prepare('SELECT * FROM escalations WHERE id = ?').get(id) as
    | Escalation
    | undefined;
}

export function listEscalations(status?: EscalationStatus): Escalation[] {
  if (status) {
    return getDb()
      .prepare('SELECT * FROM escalations WHERE status = ? ORDER BY created_at DESC')
      .all(status) as Escalation[];
  }
  return getDb()
    .prepare('SELECT * FROM escalations ORDER BY created_at DESC')
    .all() as Escalation[];
}

export function updateEscalation(
  id: string,
  patch: { status?: EscalationStatus; assignedTo?: string | null },
): void {
  const e = getEscalation(id);
  if (!e) return;
  const resolvedAt =
    patch.status === 'resolved' ? now() : e.resolved_at;
  getDb()
    .prepare(
      `UPDATE escalations
         SET status = COALESCE(?, status),
             assigned_to = COALESCE(?, assigned_to),
             resolved_at = ?
       WHERE id = ?`,
    )
    .run(patch.status ?? null, patch.assignedTo ?? null, resolvedAt, id);
}
