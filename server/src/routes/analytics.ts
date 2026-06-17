import { Router } from 'express';
import { getAnalytics } from '../db/repo/analytics.js';
import { providerHealth, activeProviderIds } from '../providers/registry.js';
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
