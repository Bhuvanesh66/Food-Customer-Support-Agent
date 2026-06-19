// Server-side domain types (DB rows + API view models).

export type ConversationStatus = 'ai' | 'awaiting_human' | 'human' | 'resolved';
export type MessageRole = 'user' | 'assistant' | 'tool' | 'system' | 'human_agent';
export type DocSourceType = 'pdf' | 'markdown' | 'url';
export type DocStatus = 'ingesting' | 'ready' | 'failed';
export type EscalationReason =
  | 'low_confidence'
  | 'out_of_scope'
  | 'tool_escalate'
  | 'user_request';
export type EscalationStatus = 'open' | 'claimed' | 'resolved';

export type Conversation = {
  id: string;
  user_label: string | null;
  status: ConversationStatus;
  created_at: number;
  updated_at: number;
};

export type Source = { documentId: string; title: string; score: number };

export type Message = {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  tool_name: string | null;
  tool_payload: string | null;
  sources: string | null; // JSON
  provider: string | null;
  model: string | null;
  confidence: number | null;
  created_at: number;
};

export type KbDocument = {
  id: string;
  title: string;
  source_type: DocSourceType;
  source_ref: string | null;
  status: DocStatus;
  error: string | null;
  chunk_count: number;
  created_at: number;
  updated_at: number;
};

export type Escalation = {
  id: string;
  conversation_id: string;
  reason: EscalationReason;
  topic: string | null;
  handoff_summary: string; // JSON
  confidence: number | null;
  status: EscalationStatus;
  assigned_to: string | null;
  created_at: number;
  resolved_at: number | null;
};

export type HandoffSummary = {
  userIssue: string;
  conversationSummary: string;
  attemptedAnswer: string;
  retrievedSources: Source[];
  confidence: number;
  suggestedNextSteps: string[];
  sentiment?: 'positive' | 'neutral' | 'frustrated' | 'angry';
  urgency?: 'low' | 'normal' | 'high';
};

export type Ticket = {
  id: string;
  conversation_id: string | null;
  subject: string;
  body: string;
  priority: string;
  status: string;
  topic: string | null;
  created_at: number;
  resolved_at: number | null;
};

export type Feedback = {
  id: string;
  message_id: string;
  rating: number;
  comment: string | null;
  review_status: 'none' | 'queued' | 'reviewed';
  created_at: number;
};

export type AnalyticsEventType =
  | 'query_received'
  | 'ai_answered'
  | 'retrieval'
  | 'tool_called'
  | 'escalated'
  | 'ticket_created'
  | 'feedback_positive'
  | 'feedback_negative'
  | 'unanswered';
