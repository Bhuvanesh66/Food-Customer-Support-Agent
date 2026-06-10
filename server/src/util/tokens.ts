import { getEncoding, type Tiktoken } from 'js-tiktoken';

let enc: Tiktoken | null = null;

function encoder(): Tiktoken {
  // cl100k_base is a good general-purpose tokenizer proxy for sizing chunks
  // and trimming history (we don't need exact per-provider token counts).
  if (!enc) enc = getEncoding('cl100k_base');
  return enc;
}

export function countTokens(text: string): number {
  try {
    return encoder().encode(text).length;
  } catch {
    // Fallback heuristic (~4 chars/token).
    return Math.ceil(text.length / 4);
  }
}
