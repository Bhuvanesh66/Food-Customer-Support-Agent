export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatRequest = {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Hint: ask the provider for strict JSON output where supported. */
  jsonMode?: boolean;
};

export type ChatResult = {
  text: string;
  provider: string;
  model: string;
};

export type ChatChunk = { delta: string; done: boolean };

/** A uniform LLM provider interface across Gemini + OpenAI-compatible vendors. */
export interface LLMProvider {
  readonly id: string;
  readonly model: string;
  readonly supportsNativeTools: boolean;
  chat(req: ChatRequest): Promise<ChatResult>;
  chatStream(req: ChatRequest): AsyncIterable<ChatChunk>;
}

/** Error carrying an HTTP-ish status so the registry can decide on failover/cooldown. */
export class ProviderError extends Error {
  status?: number;
  retryable: boolean;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    // Retryable → cooldown this provider + fail over to the next one.
    //  • 429 (rate limit) and 5xx server errors
    //  • 404 (a misconfigured/unavailable free model — try another provider)
    //  • transient connection errors (undici "Premature close", resets, timeouts)
    const transientConn =
      /premature close|fetch failed|ECONNRESET|ETIMEDOUT|ECONNREFUSED|socket hang up|network|terminated/i.test(
        message,
      );
    this.retryable =
      status === 429 ||
      status === 404 ||
      (status != null && status >= 500) ||
      transientConn;
  }
}
