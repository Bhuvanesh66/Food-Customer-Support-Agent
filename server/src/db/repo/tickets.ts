import { getDb } from '../client.js';
import { newId, now } from '../../util/id.js';
import type { Ticket } from '../../types.js';

export function createTicket(input: {
  conversationId?: string | null;
  subject: string;
  body: string;
  priority?: string;
  topic?: string | null;
  status?: string;
  resolvedAt?: number | null;
}): Ticket {
  const db = getDb();
  const id = newId('tkt');
  db.prepare(
    `INSERT INTO tickets (id, conversation_id, subject, body, priority, status, topic, created_at, resolved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.conversationId ?? null,
    input.subject,
    input.body,
    input.priority ?? 'normal',
    input.status ?? 'open',
    input.topic ?? null,
    now(),
    input.resolvedAt ?? null,
  );
  return getDb().prepare('SELECT * FROM tickets WHERE id = ?').get(id) as Ticket;
}

export function listTickets(): Ticket[] {
  return getDb()
    .prepare('SELECT * FROM tickets ORDER BY created_at DESC')
    .all() as Ticket[];
}
