-- Synapse AI — SQLite schema
-- Timestamps are integer epoch milliseconds. IDs are text (nanoid).
-- Vectors live in kb_chunks.embedding as Float32 BLOBs (cosine computed in JS).

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS conversations (
  id          TEXT PRIMARY KEY,
  user_label  TEXT,
  status      TEXT NOT NULL DEFAULT 'ai',   -- ai | awaiting_human | human | resolved
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,            -- user | assistant | tool | system | human_agent
  content         TEXT NOT NULL,
  tool_name       TEXT,
  tool_payload    TEXT,                     -- JSON (args/result) when role='tool'
  sources         TEXT,                     -- JSON array of retrieved sources (assistant msgs)
  provider        TEXT,
  model           TEXT,
  confidence      REAL,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS kb_documents (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  source_type TEXT NOT NULL,                -- pdf | markdown | url
  source_ref  TEXT,
  status      TEXT NOT NULL DEFAULT 'ready',-- ingesting | ready | failed
  error       TEXT,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS kb_chunks (
  id          TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content     TEXT NOT NULL,
  token_count INTEGER,
  embedding   BLOB NOT NULL,                -- Float32Array bytes
  embed_model TEXT NOT NULL,                -- dimension guard
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON kb_chunks(document_id);

CREATE TABLE IF NOT EXISTS escalations (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  reason          TEXT NOT NULL,            -- low_confidence | out_of_scope | tool_escalate | user_request
  topic           TEXT,
  handoff_summary TEXT NOT NULL,            -- JSON
  confidence      REAL,
  status          TEXT NOT NULL DEFAULT 'open', -- open | claimed | resolved
  assigned_to     TEXT,
  created_at      INTEGER NOT NULL,
  resolved_at     INTEGER
);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status, created_at);

CREATE TABLE IF NOT EXISTS tickets (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  subject         TEXT NOT NULL,
  body            TEXT NOT NULL,
  priority        TEXT NOT NULL DEFAULT 'normal',
  status          TEXT NOT NULL DEFAULT 'open',  -- open | resolved
  topic           TEXT,
  created_at      INTEGER NOT NULL,
  resolved_at     INTEGER
);

CREATE TABLE IF NOT EXISTS feedback (
  id            TEXT PRIMARY KEY,
  message_id    TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  rating        INTEGER NOT NULL,           -- +1 up, -1 down
  comment       TEXT,
  review_status TEXT NOT NULL DEFAULT 'none', -- none | queued | reviewed
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_feedback_review ON feedback(review_status, created_at);

CREATE TABLE IF NOT EXISTS satisfaction (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  rating          INTEGER NOT NULL,           -- 1..5 (CSAT)
  comment         TEXT,
  review_status   TEXT NOT NULL DEFAULT 'none', -- none | queued | reviewed (low scores queued)
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_satisfaction_review ON satisfaction(review_status, created_at);

CREATE TABLE IF NOT EXISTS analytics_events (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL,
  conversation_id TEXT,
  topic           TEXT,
  provider        TEXT,
  meta            TEXT,                      -- JSON
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_type_time ON analytics_events(type, created_at);
