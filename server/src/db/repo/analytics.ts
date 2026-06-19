import { getDb } from '../client.js';
import { newId, now } from '../../util/id.js';
import type { AnalyticsEventType } from '../../types.js';

export function insertEvent(input: {
  type: AnalyticsEventType;
  conversationId?: string | null;
  topic?: string | null;
  provider?: string | null;
  meta?: unknown;
}): void {
  getDb()
    .prepare(
      `INSERT INTO analytics_events (id, type, conversation_id, topic, provider, meta, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      newId('evt'),
      input.type,
      input.conversationId ?? null,
      input.topic ?? null,
      input.provider ?? null,
      input.meta != null ? JSON.stringify(input.meta) : null,
      now(),
    );
}

function count(type: AnalyticsEventType): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) AS n FROM analytics_events WHERE type = ?')
    .get(type) as { n: number };
  return row.n;
}

/** Everything the admin dashboard needs, in one pass. */
export function getAnalytics() {
  const db = getDb();

  const totalQueries = count('query_received');
  const answered = count('ai_answered');
  const escalated = count('escalated');
  const denom = answered + escalated;
  const resolutionRate = denom > 0 ? answered / denom : 0;
  const escalationRate = denom > 0 ? escalated / denom : 0;

  // Average AI confidence over answered turns.
  const confRow = db
    .prepare(
      `SELECT AVG(confidence) AS avg FROM messages WHERE role = 'assistant' AND confidence IS NOT NULL`,
    )
    .get() as { avg: number | null };

  // Query volume per day (last 14 days), epoch-ms → day bucket.
  const volume = db
    .prepare(
      `SELECT CAST(created_at / 86400000 AS INTEGER) AS day, COUNT(*) AS n
         FROM analytics_events WHERE type = 'query_received'
         GROUP BY day ORDER BY day DESC LIMIT 14`,
    )
    .all() as Array<{ day: number; n: number }>;

  // Escalations grouped by topic.
  const escalationByTopic = db
    .prepare(
      `SELECT COALESCE(topic, 'uncategorized') AS topic, COUNT(*) AS n
         FROM analytics_events WHERE type = 'escalated'
         GROUP BY topic ORDER BY n DESC`,
    )
    .all() as Array<{ topic: string; n: number }>;

  // Top unanswered questions (normalized query text from 'unanswered' events).
  const unanswered = db
    .prepare(
      `SELECT json_extract(meta, '$.query') AS query, COUNT(*) AS n
         FROM analytics_events WHERE type = 'unanswered'
         GROUP BY query ORDER BY n DESC LIMIT 10`,
    )
    .all() as Array<{ query: string | null; n: number }>;

  // Provider usage (rotation insight).
  const providerUsage = db
    .prepare(
      `SELECT provider, COUNT(*) AS n
         FROM analytics_events
        WHERE type = 'ai_answered' AND provider IS NOT NULL
        GROUP BY provider ORDER BY n DESC`,
    )
    .all() as Array<{ provider: string; n: number }>;

  return {
    totals: {
      totalQueries,
      answered,
      escalated,
      resolutionRate,
      escalationRate,
      avgConfidence: confRow.avg ?? 0,
      ticketsCreated: count('ticket_created'),
      negativeFeedback: count('feedback_negative'),
      positiveFeedback: count('feedback_positive'),
    },
    volume: volume.reverse(),
    escalationByTopic,
    unanswered: unanswered.filter((u) => u.query),
    providerUsage,
  };
}

/**
 * KB gaps for the self-learning loop: cluster unanswered/escalated queries by
 * topic, with example questions per cluster, so the admin can draft a new
 * article that fills the gap.
 */
export function kbGaps(minCount = 1) {
  const db = getDb();
  const clusters = db
    .prepare(
      `SELECT COALESCE(topic, 'general') AS topic, COUNT(*) AS n
         FROM analytics_events
        WHERE type = 'unanswered'
        GROUP BY topic
        HAVING n >= ?
        ORDER BY n DESC
        LIMIT 8`,
    )
    .all(minCount) as Array<{ topic: string; n: number }>;

  return clusters.map((c) => {
    const examples = db
      .prepare(
        `SELECT DISTINCT json_extract(meta, '$.query') AS query
           FROM analytics_events
          WHERE type = 'unanswered' AND COALESCE(topic, 'general') = ?
            AND json_extract(meta, '$.query') IS NOT NULL
          ORDER BY created_at DESC LIMIT 5`,
      )
      .all(c.topic) as Array<{ query: string | null }>;
    return {
      topic: c.topic,
      count: c.n,
      examples: examples.map((e) => e.query).filter((q): q is string => Boolean(q)),
    };
  }).filter((g) => g.examples.length > 0);
}
