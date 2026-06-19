import { useEffect, useState } from 'react';
import { AdminShell } from '../components/admin/AdminShell';
import { HoloCard } from '../components/ui/HoloCard';
import { MetricIslands, type Metric } from '../components/admin/MetricIslands';
import { NetworkGraph3D } from '../components/admin/NetworkGraph3D';
import { EscalationHeatmap } from '../components/admin/EscalationHeatmap';
import { VolumeWave } from '../components/admin/VolumeWave';
import { fetchAnalytics, type Analytics } from '../api/admin';
import { hasWebGL } from '../three/shared/usePerfDetect';

export default function Admin() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const webgl = hasWebGL();

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchAnalytics()
        .then((d) => alive && setData(d))
        .catch((e) => alive && setError(String(e)));
    load();
    const t = setInterval(load, 8000); // live during the demo session
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const totals = data?.totals;
  const metrics: Metric[] = [
    { label: 'Query Volume', value: String(totals?.totalQueries ?? 0), color: '#22d3ee' },
    {
      label: 'Resolution Rate',
      value: totals ? `${Math.round(totals.resolutionRate * 100)}%` : '—',
      sub: totals ? `${totals.answered} resolved` : undefined,
      color: '#10b981',
    },
    {
      label: 'Escalation Rate',
      value: totals ? `${Math.round(totals.escalationRate * 100)}%` : '—',
      sub: totals ? `${totals.escalated} escalated` : undefined,
      color: '#f59e0b',
    },
    {
      label: 'AI Confidence',
      value: totals ? `${Math.round(totals.avgConfidence * 100)}%` : '—',
      color: '#3b82f6',
    },
  ];

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink">Admin Console</h1>
        <p className="mt-1 text-sm text-muted">
          Live operational intelligence — updates every few seconds during a session.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          Could not reach the server. Is it running on the API port? ({error})
        </div>
      )}

      {/* Floating metric islands */}
      {webgl ? (
        <HoloCard title="Key Metrics" className="mb-6">
          <MetricIslands metrics={metrics} />
        </HoloCard>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {metrics.map((m) => (
            <HoloCard key={m.label}>
              <div className="font-mono text-3xl" style={{ color: m.color }}>
                {m.value}
              </div>
              <div className="mt-1 text-xs text-muted">{m.label}</div>
            </HoloCard>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <HoloCard title="Query Volume (per day)">
          <VolumeWave data={data?.volume ?? []} />
        </HoloCard>

        <HoloCard title="Escalation Frequency by Topic">
          <EscalationHeatmap data={data?.escalationByTopic ?? []} />
        </HoloCard>

        <HoloCard title="Support Topic Network">
          <NetworkGraph3D nodes={data?.escalationByTopic ?? []} />
        </HoloCard>

        <HoloCard title="Top Unanswered Questions">
          <ul className="space-y-2">
            {(data?.unanswered ?? []).length === 0 && (
              <li className="py-6 text-center text-sm text-muted">
                Nothing unanswered yet — the agent is resolving everything.
              </li>
            )}
            {(data?.unanswered ?? []).map((u, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm"
              >
                <span className="truncate text-ink">{u.query}</span>
                <span className="ml-3 shrink-0 font-mono text-xs text-warning">×{u.n}</span>
              </li>
            ))}
          </ul>
        </HoloCard>
      </div>

      {/* Provider rotation health + KB stats */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <HoloCard title="Provider Rotation">
          <div className="space-y-2">
            {(data?.providers.health ?? []).length === 0 && (
              <p className="text-sm text-muted">No providers configured. Set keys in .env.</p>
            )}
            {(data?.providers.health ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${p.coolingDown ? 'bg-warning' : 'bg-emerald'}`}
                  />
                  <span className="text-sm text-ink">{p.id}</span>
                  <span className="font-mono text-[10px] text-muted">{p.model}</span>
                </div>
                <span className="font-mono text-xs text-muted">
                  {p.callsInWindow}/{p.rpmLimit} rpm{p.coolingDown ? ' · cooling' : ''}
                </span>
              </div>
            ))}
          </div>
        </HoloCard>

        <HoloCard title="Knowledge Base">
          <div className="flex items-center gap-8">
            <div>
              <div className="font-mono text-3xl text-cyan">{data?.knowledgeBase.documents ?? 0}</div>
              <div className="text-xs text-muted">documents</div>
            </div>
            <div>
              <div className="font-mono text-3xl text-cyan">{data?.knowledgeBase.chunks ?? 0}</div>
              <div className="text-xs text-muted">indexed chunks</div>
            </div>
            <div>
              <div className="font-mono text-3xl text-emerald">{data?.totals.ticketsCreated ?? 0}</div>
              <div className="text-xs text-muted">tickets created</div>
            </div>
          </div>
        </HoloCard>
      </div>
    </AdminShell>
  );
}
