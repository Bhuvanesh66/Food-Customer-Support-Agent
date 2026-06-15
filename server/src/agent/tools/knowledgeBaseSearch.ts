import type { Tool } from './index.js';
import { retrieve } from '../../rag/retrieve.js';
import { track } from '../../analytics/track.js';

export const knowledgeBaseSearch: Tool = {
  name: 'knowledge_base_search',
  description:
    'Search the product knowledge base (docs, FAQs, resolved tickets) for relevant information. Use this for any product/how-to/policy question before answering.',
  parameters: {
    query: 'string — the search query (rephrase the user\'s question for best retrieval)',
  },
  async run(args, ctx) {
    const query = String(args.query ?? '').trim();
    if (!query) return { ok: false, observation: 'No query provided to knowledge_base_search.' };

    track('tool_called', {
      conversationId: ctx.conversationId,
      meta: { tool: 'knowledge_base_search' },
    });
    const { chunks, maxScore } = await retrieve(query, 5);
    track('retrieval', {
      conversationId: ctx.conversationId,
      meta: { query, topScore: maxScore, k: chunks.length },
    });

    // Record sources so the loop can attach citations + compute confidence.
    ctx.collectedSources.push(...chunks);

    if (chunks.length === 0) {
      return {
        ok: true,
        observation: 'Knowledge base is empty or returned no results.',
        data: { maxScore: 0 },
      };
    }

    const formatted = chunks
      .map(
        (c, i) =>
          `[${i + 1}] (source: "${c.title}", relevance: ${c.score.toFixed(2)})\n${c.content}`,
      )
      .join('\n\n---\n\n');

    return {
      ok: true,
      observation: `Top ${chunks.length} knowledge base results (max relevance ${maxScore.toFixed(
        2,
      )}):\n\n${formatted}`,
      data: { maxScore, count: chunks.length },
    };
  },
};
