import { GoogleGenAI } from '@google/genai';
import {
  ProviderError,
  type ChatChunk,
  type ChatMessage,
  type ChatRequest,
  type ChatResult,
  type LLMProvider,
} from './types.js';
import type { ProviderConfig } from './config.js';

type GeminiContent = { role: 'user' | 'model'; parts: { text: string }[] };

/** Map OpenAI-style messages → Gemini contents + a system instruction. */
function toGemini(messages: ChatMessage[]): {
  system: string | undefined;
  contents: GeminiContent[];
} {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const contents: GeminiContent[] = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
  return { system: system || undefined, contents };
}

export function makeGeminiProvider(cfg: ProviderConfig): LLMProvider {
  const ai = new GoogleGenAI({ apiKey: cfg.apiKey });

  function toError(err: unknown): ProviderError {
    const status = (err as { status?: number })?.status;
    const message = err instanceof Error ? err.message : 'Gemini request failed';
    return new ProviderError(`[gemini] ${message}`, status);
  }

  function config(req: ChatRequest, system: string | undefined) {
    return {
      ...(system ? { systemInstruction: system } : {}),
      temperature: req.temperature ?? 0.3,
      ...(req.maxTokens ? { maxOutputTokens: req.maxTokens } : {}),
      ...(req.jsonMode ? { responseMimeType: 'application/json' } : {}),
    };
  }

  return {
    id: cfg.id,
    model: cfg.model,
    supportsNativeTools: cfg.supportsNativeTools,

    async chat(req: ChatRequest): Promise<ChatResult> {
      try {
        const { system, contents } = toGemini(req.messages);
        const res = await ai.models.generateContent({
          model: cfg.model,
          contents,
          config: config(req, system),
        });
        return { text: res.text ?? '', provider: cfg.id, model: cfg.model };
      } catch (err) {
        throw toError(err);
      }
    },

    async *chatStream(req: ChatRequest): AsyncIterable<ChatChunk> {
      try {
        const { system, contents } = toGemini(req.messages);
        const stream = await ai.models.generateContentStream({
          model: cfg.model,
          contents,
          config: config(req, system),
        });
        for await (const part of stream) {
          const delta = part.text ?? '';
          if (delta) yield { delta, done: false };
        }
        yield { delta: '', done: true };
      } catch (err) {
        throw toError(err);
      }
    },
  };
}
