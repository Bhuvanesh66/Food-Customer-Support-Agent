import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Load .env from the repo root (one level above /server).
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');
dotenv.config({ path: path.join(repoRoot, '.env') });

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const ROOT_DIR = repoRoot;
export const DATA_DIR = path.join(repoRoot, 'data');
export const DB_PATH = path.join(DATA_DIR, 'app.db');
export const SEED_DIR = path.join(DATA_DIR, 'seed');

export const env = {
  port: num(process.env.PORT, 8787),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    chatModel: process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash',
    embedModel: process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001',
    embedDim: num(process.env.GEMINI_EMBED_DIM, 768),
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-4-scout:free',
  },
  nvidia: {
    apiKey: process.env.NVIDIA_API_KEY || '',
    model: process.env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct',
  },

  agent: {
    // Slightly more lenient now that the KB is richer: borderline-relevant
    // matches resolve instead of escalating, while clearly out-of-scope
    // queries (which score far lower) still escalate.
    escalateThreshold: num(process.env.ESCALATE_THRESHOLD, 0.4),
    retrievalFloor: num(process.env.RETRIEVAL_FLOOR, 0.45),
    maxIterations: num(process.env.MAX_AGENT_ITERATIONS, 4),
  },
} as const;
