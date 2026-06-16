import { Router } from 'express';
import { listDocuments, deleteDocument, getDocument } from '../db/repo/kb.js';

export const kbRouter = Router();

kbRouter.get('/', (_req, res) => {
  res.json(listDocuments());
});

kbRouter.delete('/:id', (req, res) => {
  const doc = getDocument(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  deleteDocument(req.params.id); // cascades to chunks
  res.json({ ok: true });
});
