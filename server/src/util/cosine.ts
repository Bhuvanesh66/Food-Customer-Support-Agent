/** Pack a float vector into a Float32 Buffer for BLOB storage. */
export function floatsToBuffer(vec: number[]): Buffer {
  const f32 = new Float32Array(vec);
  return Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength);
}

/** Read a Float32 Buffer back into a Float32Array (zero-copy view). */
export function bufferToFloats(buf: Buffer): Float32Array {
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

/**
 * Cosine similarity between a query vector and a stored embedding.
 * Returns a value in [-1, 1]; for normalized text embeddings, typically [0, 1].
 */
export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
