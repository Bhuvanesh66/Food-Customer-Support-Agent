import { Router } from 'express';
import { z } from 'zod';
import {
  listEscalations,
  getEscalation,
  updateEscalation,
} from '../db/repo/escalations.js';
import type { EscalationStatus, HandoffSummary } from '../types.js';
import { suggestReplies } from '../agent/copilot.js';

export const escalationsRouter = Router();

// AI Copilot: draft suggested replies for a human agent from the handoff summary.
escalationsRouter.get('/:id/suggestions', async (req, res) => {
  const esc = getEscalation(req.params.id);
  if (!esc) return res.status(404).json({ error: 'Escalation not found' });
  try {
    const summary = JSON.parse(esc.handoff_summary) as HandoffSummary;
    const replies = await suggestReplies(summary);
    res.json({ replies });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to suggest replies' });
  }
});

escalationsRouter.get('/', (req, res) => {
  const status = req.query.status as EscalationStatus | undefined;
  const rows = listEscalations(status);
  // Parse the JSON handoff summary for the client.
  res.json(
    rows.map((e) => ({
      ...e,
      handoff_summary: safeParse(e.handoff_summary),
    })),
  );
});

const Patch = z.object({
  status: z.enum(['open', 'claimed', 'resolved']).optional(),
  assignedTo: z.string().optional(),
});

escalationsRouter.patch('/:id', (req, res) => {
  const esc = getEscalation(req.params.id);
  if (!esc) return res.status(404).json({ error: 'Escalation not found' });
  const parsed = Patch.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid patch' });
  updateEscalation(req.params.id, parsed.data);
  const updated = getEscalation(req.params.id)!;
  res.json({ ...updated, handoff_summary: safeParse(updated.handoff_summary) });
});

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return json;
  }
}
