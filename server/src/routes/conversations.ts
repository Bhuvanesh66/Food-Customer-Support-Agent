import { Router } from 'express';
import { z } from 'zod';
import {
  createConversation,
  getConversation,
  listConversations,
  setConversationStatus,
} from '../db/repo/conversations.js';
import { addMessage, listMessages } from '../db/repo/messages.js';

export const conversationsRouter = Router();

conversationsRouter.post('/', (req, res) => {
  const label = typeof req.body?.userLabel === 'string' ? req.body.userLabel : undefined;
  const conv = createConversation(label);
  res.json(conv);
});

conversationsRouter.get('/', (_req, res) => {
  res.json(listConversations());
});

conversationsRouter.get('/:id', (req, res) => {
  const conv = getConversation(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Not found' });
  res.json({ conversation: conv, messages: listMessages(conv.id) });
});

const Takeover = z.object({
  action: z.enum(['take', 'release', 'resolve']),
  agentName: z.string().optional(),
});

conversationsRouter.post('/:id/takeover', (req, res) => {
  const conv = getConversation(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Not found' });

  const parsed = Takeover.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid action' });
  const { action, agentName } = parsed.data;

  if (action === 'take') {
    setConversationStatus(conv.id, 'human');
    addMessage({
      conversationId: conv.id,
      role: 'human_agent',
      content: `${agentName || 'A human agent'} has joined the conversation.`,
    });
  } else if (action === 'release') {
    setConversationStatus(conv.id, 'ai');
  } else if (action === 'resolve') {
    setConversationStatus(conv.id, 'resolved');
  }
  res.json(getConversation(conv.id));
});
