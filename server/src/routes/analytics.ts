import { Router } from 'express';
import { getAnalytics } from '../db/repo/analytics.js';
import { providerHealth, activeProviderIds, diagnoseProviders } from '../providers/registry.js';
import { chunkCount, listDocuments } from '../db/repo/kb.js';

export const analyticsRouter = Router();

analyticsRouter.get('/analytics', (_req, res) => {
  const analytics = getAnalytics();
  res.json({
    ...analytics,
    providers: {
      active: activeProviderIds(),
      health: providerHealth(),
    },
    knowledgeBase: {
      documents: listDocuments().length,
      chunks: chunkCount(),
    },
  });
});

// Diagnostic: probe each provider with a trivial chat call, return raw results.
// Helps debug deploys where chat fails (e.g. "All providers busy").
analyticsRouter.get('/diagnose', async (_req, res) => {
  const results = await diagnoseProviders();
  res.json(results);
});
