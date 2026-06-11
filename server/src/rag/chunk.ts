import { countTokens } from '../util/tokens.js';

export type Chunk = { content: string; tokenCount: number };

// Smaller, section-level chunks give sharper retrieval scores (a query matches
// the relevant section, not a whole diluted document).
const TARGET_TOKENS = 180;
const MAX_TOKENS = 300;
const OVERLAP_TOKENS = 40; // ~20% overlap for continuity

/**
 * Structure-aware chunking:
 *  1. Split text into blocks on blank lines / markdown headings.
 *  2. Pack consecutive blocks into chunks up to TARGET_TOKENS.
 *  3. Carry a small token overlap between adjacent chunks for context continuity.
 * A single block exceeding MAX_TOKENS is hard-split by sentences.
 */
export function chunkText(text: string): Chunk[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!normalized) return [];

  // Split into semantic blocks: headings start a new block, paragraphs separated by blank lines.
  const rawBlocks = normalized.split(/\n\s*\n/);
  const blocks: string[] = [];
  for (const b of rawBlocks) {
    const trimmed = b.trim();
    if (!trimmed) continue;
    if (countTokens(trimmed) > MAX_TOKENS) {
      blocks.push(...hardSplit(trimmed));
    } else {
      blocks.push(trimmed);
    }
  }

  const chunks: Chunk[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  const flush = () => {
    if (current.length === 0) return;
    const content = current.join('\n\n');
    chunks.push({ content, tokenCount: countTokens(content) });
  };

  for (const block of blocks) {
    const t = countTokens(block);
    if (currentTokens + t > TARGET_TOKENS && current.length > 0) {
      flush();
      // Start next chunk with a tail overlap from the previous one.
      const tail = takeTail(current, OVERLAP_TOKENS);
      current = tail ? [tail] : [];
      currentTokens = tail ? countTokens(tail) : 0;
    }
    current.push(block);
    currentTokens += t;
  }
  flush();

  return chunks;
}

function takeTail(blocks: string[], maxTokens: number): string | null {
  const last = blocks[blocks.length - 1];
  if (!last) return null;
  if (countTokens(last) <= maxTokens) return last;
  // Take the trailing sentences of the last block up to maxTokens.
  const sentences = last.split(/(?<=[.!?])\s+/);
  const tail: string[] = [];
  let tokens = 0;
  for (let i = sentences.length - 1; i >= 0; i--) {
    const t = countTokens(sentences[i]);
    if (tokens + t > maxTokens) break;
    tail.unshift(sentences[i]);
    tokens += t;
  }
  return tail.join(' ') || null;
}

function hardSplit(block: string): string[] {
  const sentences = block.split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  let buf: string[] = [];
  let tokens = 0;
  for (const s of sentences) {
    const t = countTokens(s);
    if (tokens + t > MAX_TOKENS && buf.length > 0) {
      out.push(buf.join(' '));
      buf = [];
      tokens = 0;
    }
    buf.push(s);
    tokens += t;
  }
  if (buf.length) out.push(buf.join(' '));
  return out;
}
