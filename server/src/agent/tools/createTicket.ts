import type { Tool } from './index.js';
import { createTicket } from '../../db/repo/tickets.js';
import { track } from '../../analytics/track.js';

export const createTicketTool: Tool = {
  name: 'create_ticket',
  description:
    'Create a support ticket to track an issue that needs follow-up (e.g. a bug, a feature request, or a billing dispute that cannot be resolved immediately). Returns the ticket ID.',
  parameters: {
    subject: 'string — a short ticket subject',
    body: 'string — a detailed description of the issue',
    priority: 'string (optional) — "low" | "normal" | "high"',
    topic: 'string (optional) — a category, e.g. "billing", "auth", "integrations"',
  },
  async run(args, ctx) {
    const subject = String(args.subject ?? '').trim();
    const body = String(args.body ?? '').trim();
    if (!subject || !body) {
      return { ok: false, observation: 'create_ticket requires both subject and body.' };
    }
    const priority = ['low', 'normal', 'high'].includes(String(args.priority))
      ? String(args.priority)
      : 'normal';
    const topic = args.topic ? String(args.topic) : null;

    const ticket = createTicket({
      conversationId: ctx.conversationId,
      subject,
      body,
      priority,
      topic,
    });
    track('ticket_created', {
      conversationId: ctx.conversationId,
      topic,
      meta: { ticketId: ticket.id, priority },
    });

    return {
      ok: true,
      observation: `Created ticket ${ticket.id} ("${subject}", priority ${priority}). Tell the customer their reference number.`,
      data: { ticketId: ticket.id },
    };
  },
};
