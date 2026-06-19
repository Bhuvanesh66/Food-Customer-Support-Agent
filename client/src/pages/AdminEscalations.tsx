import { useEffect, useState } from 'react';
import { Sparkles, Copy } from 'lucide-react';
import { AdminShell } from '../components/admin/AdminShell';
import { HoloCard } from '../components/ui/HoloCard';
import { apiGet, apiSend } from '../api/client';
import type { Source } from '../types';

type HandoffSummary = {
  userIssue: string;
  conversationSummary: string;
  attemptedAnswer: string;
  retrievedSources: Source[];
  confidence: number;
  suggestedNextSteps: string[];
  sentiment?: string;
  urgency?: string;
};

type Escalation = {
  id: string;
  conversation_id: string;
  reason: string;
  topic: string | null;
  status: string;
  confidence: number | null;
  created_at: number;
  handoff_summary: HandoffSummary;
};

export default function AdminEscalations() {
  const [rows, setRows] = useState<Escalation[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [loadingSug, setLoadingSug] = useState<string | null>(null);

  const load = () => apiGet<Escalation[]>('/escalations').then(setRows).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, []);

  // AI Copilot: fetch suggested replies for a human agent.
  const getSuggestions = async (id: string) => {
    setLoadingSug(id);
    try {
      const r = await apiGet<{ replies: string[] }>(`/escalations/${id}/suggestions`);
      setSuggestions((s) => ({ ...s, [id]: r.replies }));
    } catch {
      setSuggestions((s) => ({ ...s, [id]: ['(Could not generate suggestions — try again.)'] }));
    } finally {
      setLoadingSug(null);
    }
  };

  const claim = async (e: Escalation) => {
    await apiSend(`/escalations/${e.id}`, 'PATCH', { status: 'claimed', assignedTo: 'Demo Agent' });
    // Take over the conversation so the chat badge flips to "human".
    await apiSend(`/conversations/${e.conversation_id}/takeover`, 'POST', {
      action: 'take',
      agentName: 'Demo Agent',
    });
    load();
  };

  const resolve = async (e: Escalation) => {
    await apiSend(`/escalations/${e.id}`, 'PATCH', { status: 'resolved' });
    await apiSend(`/conversations/${e.conversation_id}/takeover`, 'POST', { action: 'resolve' });
    load();
  };

  const reasonColor = (r: string) =>
    r === 'out_of_scope' ? 'text-warning' : r === 'low_confidence' ? 'text-cyan' : 'text-muted';

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink">Human Handoff Queue</h1>
        <p className="mt-1 text-sm text-muted">
          Escalated conversations with full structured context — claim one to take over.
        </p>
      </div>

      <HoloCard title={`Queue (${rows.filter((r) => r.status !== 'resolved').length} open)`}>
        <div className="space-y-3">
          {rows.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">
              No escalations yet. Ask the agent an out-of-scope question to generate one.
            </p>
          )}
          {rows.map((e) => (
            <div key={e.id} className="rounded-xl border border-hairline bg-white/5">
              <button
                onClick={() => setOpenId(openId === e.id ? null : e.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm text-ink">{e.handoff_summary.userIssue}</div>
                  <div className="mt-0.5 flex items-center gap-3 font-mono text-[11px]">
                    <span className={reasonColor(e.reason)}>{e.reason}</span>
                    {e.topic && <span className="text-muted">{e.topic}</span>}
                    <span className="text-muted">
                      conf {Math.round((e.confidence ?? 0) * 100)}%
                    </span>
                    {e.handoff_summary.sentiment && e.handoff_summary.sentiment !== 'neutral' && (
                      <span className="capitalize text-warning">{e.handoff_summary.sentiment}</span>
                    )}
                    {e.handoff_summary.urgency === 'high' && (
                      <span className="rounded bg-danger/15 px-1.5 text-danger">URGENT</span>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] uppercase ${
                    e.status === 'resolved'
                      ? 'bg-emerald/15 text-emerald'
                      : e.status === 'claimed'
                        ? 'bg-warning/15 text-warning'
                        : 'bg-cyan/15 text-cyan'
                  }`}
                >
                  {e.status}
                </span>
              </button>

              {openId === e.id && (
                <div className="border-t border-hairline px-4 py-4">
                  <Detail label="Conversation summary" value={e.handoff_summary.conversationSummary} pre />
                  <Detail label="AI attempted" value={e.handoff_summary.attemptedAnswer} />
                  {e.handoff_summary.retrievedSources?.length > 0 && (
                    <div className="mb-3">
                      <Label>Sources reviewed</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {e.handoff_summary.retrievedSources.map((s) => (
                          <span key={s.documentId} className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-cyan">
                            {s.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mb-4">
                    <Label>Suggested next steps</Label>
                    <ul className="list-disc pl-5 text-sm text-ink/90">
                      {e.handoff_summary.suggestedNextSteps?.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>

                  {/* AI Copilot — suggested replies for the human agent */}
                  <div className="mb-4 rounded-xl border border-cyan/20 bg-cyan/5 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-cyan">
                        <Sparkles size={12} /> AI Copilot — suggested replies
                      </span>
                      {!suggestions[e.id] && (
                        <button
                          onClick={() => getSuggestions(e.id)}
                          disabled={loadingSug === e.id}
                          className="rounded-lg bg-cyan/15 px-3 py-1 text-xs text-cyan transition-colors hover:bg-cyan/25 disabled:opacity-50"
                        >
                          {loadingSug === e.id ? 'Generating…' : 'Generate'}
                        </button>
                      )}
                    </div>
                    {suggestions[e.id]?.map((r, i) => (
                      <div key={i} className="mb-2 flex items-start gap-2 rounded-lg bg-black/20 p-2.5">
                        <p className="flex-1 text-sm text-ink/90">{r}</p>
                        <button
                          onClick={() => navigator.clipboard?.writeText(r)}
                          aria-label="Copy"
                          className="shrink-0 rounded p-1 text-muted transition-colors hover:text-cyan"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    ))}
                    {!suggestions[e.id] && loadingSug !== e.id && (
                      <p className="text-xs text-muted">
                        Click Generate to draft 2–3 ready-to-send replies from the context above.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {e.status === 'open' && (
                      <button
                        onClick={() => claim(e)}
                        className="rounded-lg bg-warning/15 px-4 py-2 text-sm text-warning transition-colors hover:bg-warning/25"
                      >
                        Take over conversation
                      </button>
                    )}
                    {e.status !== 'resolved' && (
                      <button
                        onClick={() => resolve(e)}
                        className="rounded-lg bg-emerald/15 px-4 py-2 text-sm text-emerald transition-colors hover:bg-emerald/25"
                      >
                        Mark resolved
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </HoloCard>
    </AdminShell>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">{children}</div>
  );
}
function Detail({ label, value, pre }: { label: string; value: string; pre?: boolean }) {
  return (
    <div className="mb-3">
      <Label>{label}</Label>
      <div className={`text-sm text-ink/90 ${pre ? 'whitespace-pre-wrap' : ''}`}>{value}</div>
    </div>
  );
}
