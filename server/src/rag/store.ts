import {
  createDocument,
  setDocumentStatus,
  deleteChunksForDocument,
  insertChunks,
  type ChunkInsert,
} from '../db/repo/kb.js';
import { chunkText } from './chunk.js';
import { embedTexts, EMBED_MODEL } from '../embeddings/gemini.js';
import { floatsToBuffer } from '../util/cosine.js';
import type { ExtractedDoc } from './ingest.js';
import type { KbDocument as KbDocType } from '../types.js';

/**
 * Ingest an already-extracted document: chunk → embed → store atomically.
 * Document is created with status 'ingesting' and flipped to 'ready' only
 * after chunks commit, so the UI never sees a half-built doc.
 */
export async function ingestDocument(doc: ExtractedDoc): Promise<KbDocType> {
  const record = createDocument({
    title: doc.title,
    sourceType: doc.sourceType,
    sourceRef: doc.sourceRef,
  });

  try {
    const chunks = chunkText(doc.text);
    if (chunks.length === 0) throw new Error('Document produced no chunks.');

    const vectors = await embedTexts(chunks.map((c) => c.content));

    const rows: ChunkInsert[] = chunks.map((c, i) => ({
      documentId: record.id,
      chunkIndex: i,
      content: c.content,
      tokenCount: c.tokenCount,
      embedding: floatsToBuffer(vectors[i]),
      embedModel: EMBED_MODEL,
    }));

    insertChunks(rows); // single transaction
    setDocumentStatus(record.id, 'ready', { chunkCount: rows.length });
    return { ...record, status: 'ready', chunk_count: rows.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ingestion failed';
    deleteChunksForDocument(record.id);
    setDocumentStatus(record.id, 'failed', { error: message });
    throw err;
  }
}
