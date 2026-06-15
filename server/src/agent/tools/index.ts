import type { RetrievedChunk } from '../../rag/retrieve.js';

/** Shared context threaded through every tool invocation during a turn. */
export type ToolContext = {
  conversationId: string;
  // Accumulates sources surfaced by knowledge_base_search this turn.
  collectedSources: RetrievedChunk[];
  // Set when escalate_to_human is invoked.
  escalation?: { reason: string; summary: string };
};

export type ToolResult = {
  ok: boolean;
  // Human/LLM-readable observation appended to the transcript as a tool message.
  observation: string;
  data?: unknown;
};

export type Tool = {
  name: string;
  description: string;
  /** JSON-schema-ish parameter doc, rendered into the system prompt. */
  parameters: Record<string, string>;
  run: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
};

import { knowledgeBaseSearch } from './knowledgeBaseSearch.js';
import { checkOrderStatus } from './checkOrderStatus.js';
import { createTicketTool } from './createTicket.js';
import { escalateToHuman } from './escalateToHuman.js';

export const TOOLS: Tool[] = [
  knowledgeBaseSearch,
  checkOrderStatus,
  createTicketTool,
  escalateToHuman,
];

export function getTool(name: string): Tool | undefined {
  return TOOLS.find((t) => t.name === name);
}
