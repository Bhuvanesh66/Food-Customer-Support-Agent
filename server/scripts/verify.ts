import '../src/config/env.js';
import { migrate } from '../src/db/client.js';
import { initProviders } from '../src/providers/registry.js';
import { createConversation } from '../src/db/repo/conversations.js';
import { runAgentTurn, type AgentEvent } from '../src/agent/loop.js';

migrate();
initProviders();

// Demo test set: in-scope should resolve; out-of-scope should escalate.
const IN_SCOPE = [
  'How do I reset my password?',
  'Why was my payment declined?',
  'My order is late, what should I do?',
  'How do I report a missing item?',
  'How do I cancel my order?',
  'How much is FoodAssist Plus?',
  'How do refunds work?',
  'What is the status of order FA-1002?', // exercises check_order_status tool
];
const OUT_OF_SCOPE = [
  'What is the capital of France?',
  'Can you write me a poem about cats?',
  'What is the weather in Tokyo today?',
];

type Outcome = { q: string; resolved: boolean; escalated: boolean; confidence: number; provider?: string };

async function ask(q: string): Promise<Outcome> {
  const conv = createConversation('verify');
  let resolved = false;
  let escalated = false;
  let confidence = 0;
  let provider: string | undefined;

  const emit = (ev: AgentEvent) => {
    if (ev.type === 'final') {
      resolved = true;
      confidence = ev.confidence;
      provider = ev.provider;
    } else if (ev.type === 'escalated') {
      escalated = true;
    } else if (ev.type === 'confidence') {
      confidence = ev.confidence;
    }
  };
  await runAgentTurn(conv.id, q, emit);
  return { q, resolved, escalated, confidence, provider };
}

async function main() {
  console.log('\n══════════ IN-SCOPE (should resolve) ══════════');
  const inResults: Outcome[] = [];
  for (const q of IN_SCOPE) {
    const r = await ask(q);
    inResults.push(r);
    const mark = r.resolved ? '✓ RESOLVED' : r.escalated ? '↑ escalated' : '? unknown';
    console.log(`${mark}  conf=${r.confidence.toFixed(2)}  [${r.provider ?? '-'}]  ${q}`);
  }

  console.log('\n══════════ OUT-OF-SCOPE (should escalate) ══════════');
  const outResults: Outcome[] = [];
  for (const q of OUT_OF_SCOPE) {
    const r = await ask(q);
    outResults.push(r);
    const mark = r.escalated ? '✓ ESCALATED' : r.resolved ? '✗ resolved (wrong!)' : '? unknown';
    console.log(`${mark}  conf=${r.confidence.toFixed(2)}  ${q}`);
  }

  const resolvedCount = inResults.filter((r) => r.resolved).length;
  const resolutionRate = resolvedCount / inResults.length;
  const escalatedCorrectly = outResults.filter((r) => r.escalated).length;
  const providersUsed = new Set([...inResults, ...outResults].map((r) => r.provider).filter(Boolean));

  console.log('\n══════════ SUMMARY ══════════');
  console.log(`Resolution rate (in-scope):  ${(resolutionRate * 100).toFixed(0)}%  (${resolvedCount}/${inResults.length})  — target ≥70%`);
  console.log(`Out-of-scope escalated:       ${escalatedCorrectly}/${outResults.length}  — target 100%`);
  console.log(`Providers used in rotation:   ${[...providersUsed].join(', ') || 'none'}`);
  console.log(
    `\n${resolutionRate >= 0.7 && escalatedCorrectly === outResults.length ? '✓ PASS — meets success metrics' : '✗ REVIEW — metrics below target'}\n`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error('verify failed:', e);
  process.exit(1);
});
