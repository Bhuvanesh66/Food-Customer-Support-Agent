import { providerConfigs, type ProviderConfig } from './config.js';
import { makeOpenAICompatible } from './openaiCompatible.js';
import { makeGeminiProvider } from './gemini.js';
import {
  ProviderError,
  type ChatChunk,
  type ChatRequest,
  type ChatResult,
  type LLMProvider,
} from './types.js';

type ProviderState = {
  cfg: ProviderConfig;
  provider: LLMProvider;
  cooldownUntil: number;
  windowStart: number;
  callsInWindow: number;
  consecutiveFailures: number;
};

const RATE_WINDOW_MS = 60_000;
const COOLDOWNS_MS = [30_000, 60_000, 120_000]; // exponential, capped

let states: ProviderState[] = [];
let cursor = 0;
let initialized = false;

function build(cfg: ProviderConfig): LLMProvider {
  return cfg.kind === 'gemini' ? makeGeminiProvider(cfg) : makeOpenAICompatible(cfg);
}

export function initProviders(): void {
  states = providerConfigs().map((cfg) => ({
    cfg,
    provider: build(cfg),
    cooldownUntil: 0,
    windowStart: Date.now(),
    callsInWindow: 0,
    consecutiveFailures: 0,
  }));
  initialized = true;
  const names = states.map((s) => s.cfg.id);
  console.log(
    names.length
      ? `[providers] active rotation: ${names.join(', ')}`
      : '[providers] WARNING: no providers configured (set at least GEMINI_API_KEY).',
  );
}

function ensureInit(): void {
  if (!initialized) initProviders();
}

export function activeProviderIds(): string[] {
  ensureInit();
  return states.map((s) => s.cfg.id);
}

function eligible(s: ProviderState, now: number, needsTools: boolean): boolean {
  if (now < s.cooldownUntil) return false;
  // Slide the rate window.
  if (now - s.windowStart >= RATE_WINDOW_MS) {
    s.windowStart = now;
    s.callsInWindow = 0;
  }
  if (s.callsInWindow >= s.cfg.rpmLimit) return false;
  if (needsTools && !s.cfg.supportsNativeTools) return false;
  return true;
}

/**
 * Pick the next eligible provider, preferring lower priority numbers. Among
 * providers sharing the best available priority, a rotating cursor spreads load
 * (round-robin within a tier). Lower-priority providers (e.g. Gemini, kept for
 * embeddings) are only used when every preferred provider is busy/cooling.
 */
function pickNext(now: number, needsTools: boolean): ProviderState | null {
  const candidates = states.filter((s) => eligible(s, now, needsTools));
  if (candidates.length === 0) return null;

  // Best (lowest) priority number among eligible providers.
  const bestPriority = Math.min(...candidates.map((s) => s.cfg.priority));
  const tier = candidates.filter((s) => s.cfg.priority === bestPriority);

  // Round-robin within that tier using the shared cursor.
  cursor = (cursor + 1) % tier.length;
  return tier[cursor % tier.length];
}

function onSuccess(s: ProviderState): void {
  s.consecutiveFailures = 0;
}

function onFailure(s: ProviderState): void {
  const tier = Math.min(s.consecutiveFailures, COOLDOWNS_MS.length - 1);
  s.cooldownUntil = Date.now() + COOLDOWNS_MS[tier];
  s.consecutiveFailures++;
}

export type CallOptions = { needsTools?: boolean };

/**
 * Run a chat completion with cross-provider failover.
 * Tries eligible providers in rotation; on a retryable error (429/5xx/timeout)
 * cools that provider down and immediately tries the next. Throws only when all
 * providers are exhausted.
 */
export async function callWithFailover(
  req: ChatRequest,
  opts: CallOptions = {},
): Promise<ChatResult> {
  ensureInit();
  if (states.length === 0) {
    throw new ProviderError('No LLM providers configured. Set at least GEMINI_API_KEY.', 503);
  }

  const needsTools = Boolean(opts.needsTools);
  const attempted = new Set<string>();
  let lastErr: unknown;

  // Allow each provider one attempt per call.
  for (let i = 0; i < states.length; i++) {
    const now = Date.now();
    const s = pickNext(now, needsTools);
    if (!s || attempted.has(s.cfg.id)) {
      // None currently eligible (all cooling down / rate-limited).
      if (!s) break;
    }
    attempted.add(s.cfg.id);
    s.callsInWindow++;
    try {
      const result = await s.provider.chat(req);
      onSuccess(s);
      return result;
    } catch (err) {
      lastErr = err;
      const pErr = err as ProviderError;
      if (pErr?.retryable) {
        onFailure(s);
        console.warn(`[providers] ${s.cfg.id} failed (status ${pErr.status}); failing over.`);
        continue;
      }
      // Non-retryable (e.g. 400 bad request) — surface immediately.
      throw err;
    }
  }

  const msg =
    lastErr instanceof Error ? lastErr.message : 'All providers are rate-limited or unavailable.';
  throw new ProviderError(`All providers exhausted. Last error: ${msg}`, 503);
}

/**
 * Streaming variant. Picks ONE eligible provider (with a single non-streaming-style
 * failover attempt before the stream begins). Yields the provider id first via the
 * returned metadata, then deltas.
 */
export async function streamWithFailover(
  req: ChatRequest,
  opts: CallOptions = {},
): Promise<{ provider: LLMProvider; stream: AsyncIterable<ChatChunk> }> {
  ensureInit();
  if (states.length === 0) {
    throw new ProviderError('No LLM providers configured. Set at least GEMINI_API_KEY.', 503);
  }
  const needsTools = Boolean(opts.needsTools);

  for (let i = 0; i < states.length; i++) {
    const now = Date.now();
    const s = pickNext(now, needsTools);
    if (!s) break;
    s.callsInWindow++;
    try {
      // Begin the stream eagerly so connection errors surface here for failover.
      const stream = s.provider.chatStream(req);
      const iterator = stream[Symbol.asyncIterator]();
      const first = await iterator.next();
      onSuccess(s);

      async function* replay(): AsyncIterable<ChatChunk> {
        if (!first.done && first.value) yield first.value;
        while (true) {
          const next = await iterator.next();
          if (next.done) break;
          yield next.value;
        }
      }
      return { provider: s.provider, stream: replay() };
    } catch (err) {
      const pErr = err as ProviderError;
      if (pErr?.retryable) {
        onFailure(s);
        console.warn(`[providers] ${s.cfg.id} stream failed (status ${pErr.status}); failing over.`);
        continue;
      }
      throw err;
    }
  }
  throw new ProviderError('All providers exhausted for streaming.', 503);
}

/** Snapshot of provider health for the admin panel. */
export function providerHealth() {
  ensureInit();
  const now = Date.now();
  return states.map((s) => ({
    id: s.cfg.id,
    model: s.cfg.model,
    coolingDown: now < s.cooldownUntil,
    cooldownMsRemaining: Math.max(0, s.cooldownUntil - now),
    callsInWindow: s.callsInWindow,
    rpmLimit: s.cfg.rpmLimit,
    supportsNativeTools: s.cfg.supportsNativeTools,
  }));
}
