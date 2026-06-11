import { env } from '../config/env.js';

export type ProviderKind = 'gemini' | 'openai';

export type ProviderConfig = {
  id: string;
  kind: ProviderKind;
  baseUrl?: string; // openai-compatible only
  apiKey: string;
  model: string;
  supportsNativeTools: boolean;
  /** Conservative free-tier requests/minute (used by the rate window). */
  rpmLimit: number;
  priority: number; // lower = preferred
};

/**
 * Provider roster. Only entries with a configured API key become active.
 * Adding an OpenAI-compatible provider is one row here — no new code.
 * Free-tier RPM limits (June 2026): Groq ~30, OpenRouter ~20, NVIDIA ~40, Gemini ~15.
 */
export function providerConfigs(): ProviderConfig[] {
  const all: ProviderConfig[] = [
    // Order = chat-generation preference. Gemini is deprioritized for chat (it's
    // also our embeddings provider on a tight free quota), so Groq/NVIDIA handle
    // most chat traffic and Gemini is only used when the others are busy.
    {
      id: 'groq',
      kind: 'openai',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: env.groq.apiKey,
      model: env.groq.model,
      supportsNativeTools: true,
      rpmLimit: 28,
      priority: 1,
    },
    {
      id: 'nvidia',
      kind: 'openai',
      baseUrl: 'https://integrate.api.nvidia.com/v1',
      apiKey: env.nvidia.apiKey,
      model: env.nvidia.model,
      supportsNativeTools: false,
      rpmLimit: 38,
      priority: 2,
    },
    {
      id: 'openrouter',
      kind: 'openai',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: env.openrouter.apiKey,
      model: env.openrouter.model,
      supportsNativeTools: false,
      rpmLimit: 18,
      priority: 3,
    },
    {
      id: 'gemini',
      kind: 'gemini',
      apiKey: env.gemini.apiKey,
      model: env.gemini.chatModel,
      supportsNativeTools: true,
      // Low rpm budget for chat so the rotation reserves Gemini's free quota for
      // embeddings (which require it). It still serves chat as a last resort.
      rpmLimit: 8,
      priority: 4,
    },
  ];
  return all
    .filter((p) => p.apiKey && p.apiKey.length > 0)
    .sort((a, b) => a.priority - b.priority);
}
