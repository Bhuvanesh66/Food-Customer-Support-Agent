import { useEffect, useState } from 'react';
import { ThumbsDown, Check, Star } from 'lucide-react';
import { clsx } from 'clsx';
import { AdminShell } from '../components/admin/AdminShell';
import { HoloCard } from '../components/ui/HoloCard';
import { apiGet, apiSend } from '../api/client';

type QueuedFeedback = {
  id: string;
  message_id: string;
  rating: number;
  comment: string | null;
  created_at: number;
  message_content: string;
  conversation_id: string;
  sources: string | null;
};

type Satisfaction = {
  id: string;
  conversation_id: string | null;
  rating: number;
  comment: string | null;
  review_status: string;
  created_at: number;
};

export default function AdminFeedback() {
  const [rows, setRows] = useState<QueuedFeedback[]>([]);
  const [csat, setCsat] = useState<Satisfaction[]>([]);

  const load = () => {
    apiGet<QueuedFeedback[]>('/feedback/queue').then(setRows).catch(() => {});
    apiGet<Satisfaction[]>('/feedback/satisfaction').then(setCsat).catch(() => {});
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, []);

  const markReviewed = async (id: string) => {
    await apiSend(`/feedback/${id}/reviewed`, 'POST');
    load();
  };
  const markCsatReviewed = async (id: string) => {
    await apiSend(`/feedback/satisfaction/${id}/reviewed`, 'POST');
    load();
  };

  const avg = csat.length ? csat.reduce((s, c) => s + c.rating, 0) / csat.length : 0;

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink">Feedback Review</h1>
        <p className="mt-1 text-sm text-muted">
          Customer satisfaction ratings and answers marked unhelpful — review them to find gaps.
        </p>
      </div>

      {/* Satisfaction (CSAT) */}
      <HoloCard
        title={`Customer Satisfaction (${csat.length})`}
        className="mb-6"
        action={
          csat.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl text-warning">{avg.toFixed(1)}</span>
              <Stars value={Math.round(avg)} />
            </div>
          ) : null
        }
      >
        <div className="space-y-3">
          {csat.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">
              No satisfaction responses yet. Rate the service in chat after a couple of answers.
            </p>
          )}
          {csat.map((c) => (
            <div
              key={c.id}
              className={clsx(
                'flex items-start justify-between rounded-xl border bg-white/5 p-4',
                c.rating <= 2 ? 'border-danger/25' : 'border-hairline',
              )}
            >
              <div className="min-w-0">
                <Stars value={c.rating} />
                {c.comment && <p className="mt-2 text-sm text-ink/90">“{c.comment}”</p>}
                <div className="mt-1 font-mono text-[10px] text-muted">
                  {new Date(c.created_at).toLocaleString()}
                  {c.review_status === 'queued' && (
                    <span className="ml-2 rounded bg-danger/15 px-1.5 py-0.5 text-danger">low score</span>
                  )}
                  {c.review_status === 'reviewed' && (
                    <span className="ml-2 rounded bg-emerald/15 px-1.5 py-0.5 text-emerald">reviewed</span>
                  )}
                </div>
              </div>
              {c.review_status === 'queued' && (
                <button
                  onClick={() => markCsatReviewed(c.id)}
                  className="ml-3 flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald/15 px-3 py-1.5 text-xs text-emerald transition-colors hover:bg-emerald/25"
                >
                  <Check size={13} /> Reviewed
                </button>
              )}
            </div>
          ))}
        </div>
      </HoloCard>

      {/* Unhelpful answers */}
      <HoloCard title={`Answers marked unhelpful (${rows.length})`}>
        <div className="space-y-3">
          {rows.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">
              No negative answer feedback queued. 👎 an AI answer in chat to see it appear here.
            </p>
          )}
          {rows.map((f) => {
            const sources = parseSources(f.sources);
            return (
              <div key={f.id} className="rounded-xl border border-danger/20 bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-danger">
                  <ThumbsDown size={14} />
                  <span className="font-mono text-[11px] uppercase tracking-wide">Marked unhelpful</span>
                </div>
                <p className="text-sm text-ink/90">{f.message_content}</p>
                {f.comment && <p className="mt-2 text-xs italic text-muted">“{f.comment}”</p>}
                {sources.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {sources.map((s) => (
                      <span key={s.documentId} className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-cyan">
                        {s.title}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => markReviewed(f.id)}
                  className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald/15 px-3 py-1.5 text-xs text-emerald transition-colors hover:bg-emerald/25"
                >
                  <Check size={13} /> Mark reviewed
                </button>
              </div>
            );
          })}
        </div>
      </HoloCard>
    </AdminShell>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={15}
          className={n <= value ? 'fill-warning text-warning' : 'text-muted'}
        />
      ))}
    </div>
  );
}

function parseSources(json: string | null): Array<{ documentId: string; title: string }> {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}
