// Shared client-side view models (mirror the server API contract).

export type ConversationStatus = 'ai' | 'awaiting_human' | 'human' | 'resolved';

export type MessageRole =
  | 'user'
  | 'assistant'
  | 'tool'
  | 'system'
  | 'human_agent';

export type Source = {
  documentId: string;
  title: string;
  score: number;
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  confidence?: number;
  sources?: Source[];
  provider?: string;
  model?: string;
  pending?: boolean; // streaming in progress (client-only flag)
  feedback?: 1 | -1 | null;
  imageUrl?: string; // attached complaint photo (data URL, for thumbnail)
};

export type Conversation = {
  id: string;
  status: ConversationStatus;
  createdAt: number;
  updatedAt: number;
};
