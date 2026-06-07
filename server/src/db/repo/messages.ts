import { getDb } from '../client.js';
import { newId, now } from '../../util/id.js';
import { touchConversation } from './conversations.js';
import type { Message, MessageRole, Source } from '../../types.js';

export type NewMessage = {
  conversationId: string;
  role: MessageRole;
  content: string;
  toolName?: string | null;
  toolPayload?: unknown;
  sources?: Source[];
  provider?: string | null;
  model?: string | null;
  confidence?: number | null;
};

export function addMessage(m: NewMessage): Message {
  const db = getDb();
  const id = newId('msg');
  const ts = now();
  db.prepare(
    `INSERT INTO messages
       (id, conversation_id, role, content, tool_name, tool_payload, sources, provider, model, confidence, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    m.conversationId,
    m.role,
    m.content,
    m.toolName ?? null,
    m.toolPayload != null ? JSON.stringify(m.toolPayload) : null,
    m.sources ? JSON.stringify(m.sources) : null,
    m.provider ?? null,
    m.model ?? null,
    m.confidence ?? null,
    ts,
  );
  touchConversation(m.conversationId);
  return getMessage(id)!;
}

export function getMessage(id: string): Message | undefined {
  return getDb().prepare('SELECT * FROM messages WHERE id = ?').get(id) as
    | Message
    | undefined;
}

export function listMessages(conversationId: string): Message[] {
  return getDb()
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(conversationId) as Message[];
}
