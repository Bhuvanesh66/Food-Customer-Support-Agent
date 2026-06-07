import { getDb } from '../client.js';
import { newId, now } from '../../util/id.js';
import type { Conversation, ConversationStatus } from '../../types.js';

export function createConversation(userLabel?: string): Conversation {
  const db = getDb();
  const ts = now();
  const id = newId('conv');
  db.prepare(
    `INSERT INTO conversations (id, user_label, status, created_at, updated_at)
     VALUES (?, ?, 'ai', ?, ?)`,
  ).run(id, userLabel ?? null, ts, ts);
  return getConversation(id)!;
}

export function getConversation(id: string): Conversation | undefined {
  return getDb()
    .prepare('SELECT * FROM conversations WHERE id = ?')
    .get(id) as Conversation | undefined;
}

export function listConversations(limit = 100): Conversation[] {
  return getDb()
    .prepare('SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ?')
    .all(limit) as Conversation[];
}

export function setConversationStatus(id: string, status: ConversationStatus): void {
  getDb()
    .prepare('UPDATE conversations SET status = ?, updated_at = ? WHERE id = ?')
    .run(status, now(), id);
}

export function touchConversation(id: string): void {
  getDb().prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(now(), id);
}
