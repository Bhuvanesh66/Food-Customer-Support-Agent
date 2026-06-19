import { useEffect, useState } from 'react';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { HoloCard } from '../ui/HoloCard';
import { apiGet, apiSend } from '../../api/client';

type Gap = { topic: string; count: number; examples: string[] };
type Draft = { title: string; markdown: string };

/**
 * Self-Learning KB panel: shows the knowledge-base GAPS (clusters of unanswered
 * questions), lets the admin one-click DRAFT an article (LLM), edit it, and
 * PUBLISH it into the live KB — the product gets smarter with use.
 */
export function SelfLearningPanel({ onPublished }: { onPublished?: () => void }) {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<'draft' | 'publish' | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = () =>
    apiGet<{ gaps: Gap[] }>('/admin/kb-gaps').then((r) => setGaps(r.gaps)).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const generate = async (g: Gap) => {
    setActive(g.topic);
    setDraft(null);
    setDone(null);
    setBusy('draft');
    try {
      const d = await apiSend<Draft>('/admin/kb-gaps/draft', 'POST', {
        topic: g.topic,
        examples: g.examples,
      });
      setDraft(d);
    } catch {
      setDraft({ title: '', markdown: '⚠️ Could not generate a draft — try again.' });
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    if (!draft) return;
    setBusy('publish');
    try {
      await apiSend('/admin/kb-gaps/approve', 'POST', draft);
      setDone(`Published "${draft.title}" to the knowledge base.`);
      setDraft(null);
      setActive(null);
      onPublished?.();
      load();
    } catch {
      setDone('⚠️ Publish failed.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <HoloCard
      title="Self-Learning — Knowledge Gaps"
      action={
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-cyan">
          <Sparkles size={12} /> auto-improves
        </span>
      }
    >
      <p className="mb-3 text-xs text-muted">
        Questions the agent couldn't answer, clustered by topic. Draft & publish an article to fix
        the gap — the agent answers it next time.
      </p>

      {gaps.length === 0 && (
        <p className="py-6 text-center text-sm text-muted">
          No gaps yet — the agent is answering everything. (Ask an out-of-scope question to create one.)
        </p>
      )}

      <div className="space-y-2">
        {gaps.map((g) => (
          <div key={g.topic} className="rounded-xl border border-hairline bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <span className="text-sm capitalize text-ink">{g.topic}</span>
                <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 font-mono text-[10px] text-warning">
                  {g.count} unanswered
                </span>
              </div>
              <button
                onClick={() => generate(g)}
                disabled={busy === 'draft' && active === g.topic}
                className="flex items-center gap-1.5 rounded-lg bg-cyan/15 px-3 py-1 text-xs text-cyan transition-colors hover:bg-cyan/25 disabled:opacity-50"
              >
                {busy === 'draft' && active === g.topic ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                Generate article
              </button>
            </div>
            <div className="mt-1.5 truncate font-mono text-[11px] text-muted">
              e.g. {g.examples.slice(0, 2).join(' · ')}
            </div>

            {active === g.topic && draft && (
              <div className="mt-3 rounded-lg border border-cyan/20 bg-black/20 p-3">
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="mb-2 w-full rounded border border-hairline bg-black/20 px-2 py-1.5 text-sm text-ink focus:border-cyan/40 focus:outline-none"
                  placeholder="Article title"
                />
                <textarea
                  value={draft.markdown}
                  onChange={(e) => setDraft({ ...draft, markdown: e.target.value })}
                  rows={8}
                  className="mb-2 w-full resize-none rounded border border-hairline bg-black/20 px-2 py-1.5 font-mono text-xs text-ink focus:border-cyan/40 focus:outline-none"
                />
                <button
                  onClick={publish}
                  disabled={busy === 'publish'}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald/15 px-3 py-1.5 text-xs text-emerald transition-colors hover:bg-emerald/25 disabled:opacity-50"
                >
                  {busy === 'publish' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Approve & publish to KB
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {done && <p className="mt-3 text-sm text-emerald">{done}</p>}
    </HoloCard>
  );
}
