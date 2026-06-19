// Thin fetch wrappers + an SSE-over-fetch reader for the /api/chat stream.
// In dev, Vite proxies /api -> Express, so relative URLs work everywhere.

const BASE = '/api';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

/** Extract the server's `{error}` message from a failed response, if present. */
async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.clone().json();
    if (data && typeof data.error === 'string') return data.error;
  } catch {
    /* not JSON */
  }
  return fallback;
}

export async function apiSend<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await errorMessage(res, `${method} ${path} → ${res.status}`));
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(await errorMessage(res, `upload failed → ${res.status}`));
  return res.json() as Promise<T>;
}

export type SSEEvent = {
  type:
    | 'state'
    | 'token'
    | 'confidence'
    | 'sentiment'
    | 'sources'
    | 'final'
    | 'escalated'
    | 'error';
  [key: string]: unknown;
};

/**
 * Stream the agent turn. Chat needs a POST body, so we use fetch + a
 * ReadableStream reader (not EventSource). Each SSE frame is `data: {json}\n\n`.
 */
export async function streamChat(
  body: {
    conversationId: string;
    message: string;
    image?: { data: string; mimeType: string };
  },
  onEvent: (ev: SSEEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`chat stream → ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = frame.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue; // heartbeat comment
      const json = line.slice(5).trim();
      if (!json) continue;
      try {
        onEvent(JSON.parse(json) as SSEEvent);
      } catch {
        /* ignore malformed frame */
      }
    }
  }
}
