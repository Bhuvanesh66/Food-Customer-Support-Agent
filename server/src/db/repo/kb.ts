import { getDb } from '../client.js';
import { newId, now } from '../../util/id.js';
import type { KbDocument, DocSourceType, DocStatus } from '../../types.js';

export function createDocument(input: {
  title: string;
  sourceType: DocSourceType;
  sourceRef?: string | null;
}): KbDocument {
  const db = getDb();
  const id = newId('doc');
  const ts = now();
  db.prepare(
    `INSERT INTO kb_documents (id, title, source_type, source_ref, status, chunk_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'ingesting', 0, ?, ?)`,
  ).run(id, input.title, input.sourceType, input.sourceRef ?? null, ts, ts);
  return getDocument(id)!;
}

export function getDocument(id: string): KbDocument | undefined {
  return getDb().prepare('SELECT * FROM kb_documents WHERE id = ?').get(id) as
    | KbDocument
    | undefined;
}

export function listDocuments(): KbDocument[] {
  return getDb()
    .prepare('SELECT * FROM kb_documents ORDER BY created_at DESC')
    .all() as KbDocument[];
}

export function setDocumentStatus(
  id: string,
  status: DocStatus,
  opts: { chunkCount?: number; error?: string | null } = {},
): void {
  getDb()
    .prepare(
      `UPDATE kb_documents
         SET status = ?, chunk_count = COALESCE(?, chunk_count), error = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(status, opts.chunkCount ?? null, opts.error ?? null, now(), id);
}

export function deleteDocument(id: string): void {
  // CASCADE removes its chunks.
  getDb().prepare('DELETE FROM kb_documents WHERE id = ?').run(id);
}

// ── Chunks ──

export type ChunkInsert = {
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  embedding: Buffer;
  embedModel: string;
};

/** Bulk-insert chunks in a single transaction. */
export function insertChunks(chunks: ChunkInsert[]): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO kb_chunks (id, document_id, chunk_index, content, token_count, embedding, embed_model, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const ts = now();
  const tx = db.transaction((rows: ChunkInsert[]) => {
    for (const c of rows) {
      stmt.run(
        newId('chk'),
        c.documentId,
        c.chunkIndex,
        c.content,
        c.tokenCount,
        c.embedding,
        c.embedModel,
        ts,
      );
    }
  });
  tx(chunks);
}

export function deleteChunksForDocument(documentId: string): void {
  getDb().prepare('DELETE FROM kb_chunks WHERE document_id = ?').run(documentId);
}

export type ChunkRow = {
  id: string;
  document_id: string;
  content: string;
  embedding: Buffer;
  embed_model: string;
};

/** Load all chunks (id, content, embedding) for brute-force cosine retrieval. */
export function allChunksWithEmbeddings(): ChunkRow[] {
  return getDb()
    .prepare('SELECT id, document_id, content, embedding, embed_model FROM kb_chunks')
    .all() as ChunkRow[];
}

export function chunkCount(): number {
  const row = getDb().prepare('SELECT COUNT(*) AS n FROM kb_chunks').get() as {
    n: number;
  };
  return row.n;
}
