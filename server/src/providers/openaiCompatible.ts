import OpenAI from 'openai';
import {
  ProviderError,
  type ChatChunk,
  type ChatRequest,
  type ChatResult,
  type LLMProvider,
} from './types.js';
import type { ProviderConfig } from './config.js';

/**
 * One adapter for every OpenAI-compatible vendor (Groq / OpenRouter / NVIDIA NIM).
 * Differences are entirely in baseUrl + apiKey + model from config.
 */
export function makeOpenAICompatible(cfg: ProviderConfig): LLMProvider {
  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseUrl,
    // OpenRouter recommends these headers; harmless elsewhere.
    defaultHeaders: {
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Synapse AI',
    },
  });

  function toError(err: unknown): ProviderError {
    const status = (err as { status?: number })?.status;
    const message = err instanceof Error ? err.message : 'OpenAI-compatible request failed';
    return new ProviderError(`[${cfg.id}] ${message}`, status);
  }

  return {
    id: cfg.id,
    model: cfg.model,
    supportsNativeTools: cfg.supportsNativeTools,

    async chat(req: ChatRequest): Promise<ChatResult> {
      try {
        const res = await client.chat.completions.create({
          model: cfg.model,
          messages: req.messages,
          temperature: req.temperature ?? 0.3,
          max_tokens: req.maxTokens,
          ...(req.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        });
        const text = res.choices[0]?.message?.content ?? '';
        return { text, provider: cfg.id, model: cfg.model };
      } catch (err) {
        throw toError(err);
      }
    },

    async *chatStream(req: ChatRequest): AsyncIterable<ChatChunk> {
      try {
        const stream = await client.chat.completions.create({
          model: cfg.model,
          messages: req.messages,
          temperature: req.temperature ?? 0.3,
          max_tokens: req.maxTokens,
          stream: true,
        });
        for await (const part of stream) {
          const delta = part.choices[0]?.delta?.content ?? '';
          if (delta) yield { delta, done: false };
        }
        yield { delta: '', done: true };
      } catch (err) {
        throw toError(err);
      }
    },
  };
}
