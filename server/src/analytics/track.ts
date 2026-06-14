import { insertEvent } from '../db/repo/analytics.js';
import type { AnalyticsEventType } from '../types.js';

/**
 * Fire-and-forget analytics. Never throw into the request path — a logging
 * failure must not break a chat turn.
 */
export function track(
  type: AnalyticsEventType,
  data: {
    conversationId?: string | null;
    topic?: string | null;
    provider?: string | null;
    meta?: unknown;
  } = {},
): void {
  try {
    insertEvent({ type, ...data });
  } catch (err) {
    console.error('[analytics] failed to record', type, err);
  }
}
