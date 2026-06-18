import './config/env.js';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { migrate } from './db/client.js';
import { initProviders, activeProviderIds } from './providers/registry.js';

import { chatRouter } from './routes/chat.js';
import { conversationsRouter } from './routes/conversations.js';
import { ingestRouter } from './routes/ingest.js';
import { kbRouter } from './routes/kb.js';
import { feedbackRouter } from './routes/feedback.js';
import { escalationsRouter } from './routes/escalations.js';
import { analyticsRouter } from './routes/analytics.js';

// Ensure schema exists + providers are initialized at boot.
migrate();
initProviders();

const app = express();

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'synapse-ai-server',
    time: Date.now(),
    providers: activeProviderIds(),
  });
});

app.use('/api/chat', chatRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/ingest', ingestRouter);
app.use('/api/kb', kbRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/escalations', escalationsRouter);
app.use('/api/admin', analyticsRouter);

// ── Serve the built client (production) ──────────────────────────────────────
// In a single-service deploy, Express serves the React SPA from client/dist so
// the API and UI share one origin (no CORS, relative /api just works).
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: any non-/api route returns index.html (client-side routing).
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log('[server] serving client build from', clientDist);
}

// Central error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  console.error('[error]', err);
  if (!res.headersSent) res.status(500).json({ error: message });
});

// Bind to 0.0.0.0 so cloud hosts (Render/Railway) can route to it.
app.listen(env.port, '0.0.0.0', () => {
  console.log(`\n  ⚡ Synapse AI server  →  http://localhost:${env.port}`);
  console.log(`     health             →  http://localhost:${env.port}/api/health\n`);
});
