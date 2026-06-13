import { allChunksWithEmbeddings } from '../db/repo/kb.js';
import { getDocument } from '../db/repo/kb.js';
import { embedQuery } from '../embeddings/gemini.js';
import { bufferToFloats, cosine } from '../util/cosine.js';

export type RetrievedChunk = {
  chunkId: string;
  documentId: string;
  title: string;
  content: string;
  score: number;
};

export type RetrievalResult = {
  chunks: RetrievedChunk[];
  maxScore: number; // drives confidence
};

// Cache document titles for the duration of a retrieval call.
function titleCache() {
  const cache = new Map<string, string>();
  return (docId: string): string => {
    if (!cache.has(docId)) {
      cache.set(docId, getDocument(docId)?.title ?? 'Unknown document');
    }
    return cache.get(docId)!;
  };
}

/**
 * Retrieve the top-k most relevant chunks for a query via brute-force cosine.
 * At assignment scale (hundreds–low-thousands of chunks) this is sub-10ms and
 * needs no index — so freshly ingested docs are queryable immediately.
 */
export async function retrieve(query: string, k = 5): Promise<RetrievalResult> {
  const rows = allChunksWithEmbeddings();
  if (rows.length === 0) return { chunks: [], maxScore: 0 };

  let qvec: number[];
  try {
    qvec = await embedQuery(query);
  } catch (err) {
    // Degrade gracefully: a transient embedding failure shouldn't crash the turn.
    // No retrieval signal → low confidence → the agent escalates safely.
    console.error('[retrieve] query embedding failed; returning no matches:', err);
    return { chunks: [], maxScore: 0 };
  }
  const getTitle = titleCache();

  const scored = rows.map((r) => ({
    chunkId: r.id,
    documentId: r.document_id,
    content: r.content,
    score: cosine(qvec, bufferToFloats(r.embedding)),
  }));

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, k).map((s) => ({
    ...s,
    title: getTitle(s.documentId),
  }));

  return {
    chunks: top,
    maxScore: top.length > 0 ? top[0].score : 0,
  };
}
