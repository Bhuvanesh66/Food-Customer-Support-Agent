/**
 * Universal, provider-agnostic tool protocol.
 *
 * Every model — whether or not it supports native function-calling — is asked to
 * reply with exactly ONE JSON object:
 *   • { "tool": "name", "args": { ... } }            → call a tool
 *   • { "final": "answer", "confidence": 0..1,        → finish the turn
 *       "answerable": true|false, "topic": "..." }
 *
 * The parser tolerates code fences and surrounding prose by extracting the first
 * balanced JSON object in the text.
 */

export type ToolCall = { kind: 'tool'; tool: string; args: Record<string, unknown> };
export type FinalAnswer = {
  kind: 'final';
  final: string;
  confidence: number;
  answerable: boolean;
  topic?: string;
};
export type ParsedAction = ToolCall | FinalAnswer | { kind: 'unparseable'; raw: string };

/** Extract the first balanced {...} JSON object from arbitrary model text. */
export function extractJsonObject(text: string): string | null {
  // Strip code fences first.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  const start = candidate.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') inString = !inString;
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return candidate.slice(start, i + 1);
    }
  }
  return null;
}

export function parseAction(text: string): ParsedAction {
  const json = extractJsonObject(text);
  if (!json) return { kind: 'unparseable', raw: text };

  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return { kind: 'unparseable', raw: text };
  }

  if (typeof obj.tool === 'string') {
    return {
      kind: 'tool',
      tool: obj.tool,
      args: (obj.args && typeof obj.args === 'object' ? obj.args : {}) as Record<string, unknown>,
    };
  }

  if (typeof obj.final === 'string') {
    const confidence =
      typeof obj.confidence === 'number' ? clamp01(obj.confidence) : 0.5;
    const answerable = obj.answerable !== false; // default true
    return {
      kind: 'final',
      final: obj.final,
      confidence,
      answerable,
      topic: typeof obj.topic === 'string' ? obj.topic : undefined,
    };
  }

  return { kind: 'unparseable', raw: text };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
