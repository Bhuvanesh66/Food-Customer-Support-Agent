import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

let client: GoogleGenAI | null = null;

function genai(): GoogleGenAI {
  if (!env.gemini.apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Embeddings require a Gemini key (free at https://aistudio.google.com/apikey).',
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey: env.gemini.apiKey });
  return client;
}

export const EMBED_MODEL = env.gemini.embedModel;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Embed a single batch with retry/backoff on transient (429/5xx) errors. */
async function embedBatch(texts: string[]): Promise<number[][]> {
  const ai = genai();
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await ai.models.embedContent({
        model: EMBED_MODEL,
        contents: texts,
        config: { outputDimensionality: env.gemini.embedDim },
      });
      const embeddings = res.embeddings ?? [];
      if (embeddings.length !== texts.length) {
        throw new Error(
          `Embedding count mismatch: got ${embeddings.length}, expected ${texts.length}`,
        );
      }
      return embeddings.map((e) => e.values ?? []);
    } catch (err: unknown) {
      attempt++;
      const status = (err as { status?: number })?.status;
      const transient = status === 429 || (status != null && status >= 500);
      if (!transient || attempt > 4) throw err;
      const backoff = Math.min(1000 * 2 ** (attempt - 1), 8000);
      console.warn(`[embeddings] transient error (status ${status}); retry ${attempt} in ${backoff}ms`);
      await sleep(backoff);
    }
  }
}

/**
 * Embed many texts, batched to keep request sizes reasonable.
 * Returns vectors in the same order as the input.
 */
export async function embedTexts(texts: string[], batchSize = 50): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const vecs = await embedBatch(batch);
    out.push(...vecs);
  }
  return out;
}

/** Embed a single query string. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedBatch([text]);
  return vec;
}
