import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { extractPdf, extractMarkdown, extractUrl } from '../rag/ingest.js';
import { ingestDocument } from '../rag/store.js';

export const ingestRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Markdown / URL ingestion (JSON body)
const JsonBody = z.union([
  z.object({ type: z.literal('markdown'), title: z.string().optional(), content: z.string().min(1) }),
  z.object({ type: z.literal('url'), url: z.string().url() }),
]);

ingestRouter.post('/', upload.single('file'), async (req, res) => {
  try {
    // PDF upload path (multipart)
    if (req.file) {
      const doc = await extractPdf(req.file.buffer, req.file.originalname);
      const record = await ingestDocument(doc);
      return res.json(record);
    }

    const parsed = JsonBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Provide a PDF file, or {type:"markdown",content} or {type:"url",url}.' });
    }

    if (parsed.data.type === 'markdown') {
      const doc = extractMarkdown(parsed.data.content, parsed.data.title);
      const record = await ingestDocument(doc);
      return res.json(record);
    } else {
      const doc = await extractUrl(parsed.data.url);
      const record = await ingestDocument(doc);
      return res.json(record);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ingestion failed';
    res.status(422).json({ error: message });
  }
});
