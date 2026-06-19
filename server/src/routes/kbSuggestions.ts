import { Router } from 'express';
import { z } from 'zod';
import { kbGaps } from '../db/repo/analytics.js';
import { draftArticle } from '../kb/suggestArticle.js';
import { ingestDocument } from '../rag/store.js';
import { extractMarkdown } from '../rag/ingest.js';

/**
 * Self-learning KB endpoints (mounted under /api/admin):
 *  GET  /kb-gaps         → clusters of unanswered questions by topic
 *  POST /kb-gaps/draft   → LLM-draft an article for a topic+examples
 *  POST /kb-gaps/approve → ingest an (edited) article into the live KB
 */
export const kbSuggestionsRouter = Router();

kbSuggestionsRouter.get('/kb-gaps', (_req, res) => {
  res.json({ gaps: kbGaps() });
});

const Draft = z.object({
  topic: z.string().min(1),
  examples: z.array(z.string()).min(1),
});

kbSuggestionsRouter.post('/kb-gaps/draft', async (req, res) => {
  const parsed = Draft.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'topic and examples required.' });
  try {
    const draft = await draftArticle(parsed.data.topic, parsed.data.examples);
    res.json(draft);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Draft failed' });
  }
});

const Approve = z.object({
  title: z.string().min(1),
  markdown: z.string().min(10),
});

kbSuggestionsRouter.post('/kb-gaps/approve', async (req, res) => {
  const parsed = Approve.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'title and markdown required.' });
  try {
    // Publish into the live KB via the existing ingestion pipeline (chunk+embed).
    const doc = extractMarkdown(parsed.data.markdown, parsed.data.title);
    const record = await ingestDocument(doc);
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Publish failed' });
  }
});
