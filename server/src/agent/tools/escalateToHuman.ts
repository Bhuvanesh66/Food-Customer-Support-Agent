import type { Tool } from './index.js';

/**
 * Escalation is finalized by the agent loop (which builds the full structured
 * handoff summary and writes the escalations row). This tool simply signals the
 * intent + reason so the loop can branch into the escalation path.
 */
export const escalateToHuman: Tool = {
  name: 'escalate_to_human',
  description:
    'Escalate the conversation to a human support agent when you cannot resolve the issue: the knowledge base lacks the answer, the request is out of scope, the customer is frustrated and asks for a human, or the issue requires account actions you cannot perform.',
  parameters: {
    reason: 'string — short reason for escalation',
    summary: 'string — a concise summary of the issue and what was attempted',
  },
  async run(args, ctx) {
    const reason = String(args.reason ?? 'unspecified').trim();
    const summary = String(args.summary ?? '').trim();
    ctx.escalation = { reason, summary };
    return {
      ok: true,
      observation: 'Escalation requested. Handing off to a human agent with full context.',
      data: { reason },
    };
  },
};
