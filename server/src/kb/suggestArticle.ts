import { callWithFailover } from '../providers/registry.js';
import { extractJsonObject } from '../agent/toolProtocol.js';

export type ArticleDraft = { title: string; markdown: string };

/**
 * Self-learning KB: given a cluster of unanswered questions on a topic, draft a
 * candidate knowledge-base article (title + markdown) the admin can review and
 * approve. Maps the failure pattern into reusable documentation.
 */
export async function draftArticle(topic: string, examples: string[]): Promise<ArticleDraft> {
  const prompt = `You are a knowledge-base editor for "FoodAssist AI" (a food delivery app).
Customers repeatedly asked questions our knowledge base could NOT answer, on the topic "${topic}".

Unanswered customer questions:
${examples.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Write a concise, helpful knowledge-base article that would let our support agent answer these in
future. Use plausible, sensible food-delivery policies (refunds, delivery, account, etc.). Be
specific and actionable.

Reply with EXACTLY ONE JSON object, no prose, no fences:
{"title": "<short article title>", "markdown": "<the article in markdown, with a # H1 and a few ## sections>"}`;

  try {
    const res = await callWithFailover(
      { messages: [{ role: 'user', content: prompt }], temperature: 0.4 },
      { needsTools: false },
    );
    const json = extractJsonObject(res.text);
    if (json) {
      const o = JSON.parse(json) as Partial<ArticleDraft>;
      if (typeof o.title === 'string' && typeof o.markdown === 'string') {
        return { title: o.title.trim(), markdown: o.markdown.trim() };
      }
    }
  } catch {
    /* fall through */
  }
  // Fallback draft so the admin always has a starting point.
  return {
    title: `${topic[0].toUpperCase()}${topic.slice(1)} — FAQ`,
    markdown:
      `# ${topic} — Frequently Asked Questions\n\n` +
      examples.map((q) => `## ${q}\n\n_Answer to be written by the team._`).join('\n\n'),
  };
}
