import { clsx } from 'clsx';
import type { ConversationStatus } from '../../types';

const MAP: Record<
  ConversationStatus,
  { label: string; color: string; dot: string }
> = {
  ai: { label: 'Synapse AI', color: 'text-cyan', dot: 'bg-cyan shadow-[0_0_10px_#22d3ee]' },
  awaiting_human: {
    label: 'Waiting for an agent',
    color: 'text-muted',
    dot: 'bg-muted',
  },
  human: {
    label: 'Connected to human agent',
    color: 'text-warning',
    dot: 'bg-warning shadow-[0_0_10px_#f59e0b]',
  },
  resolved: { label: 'Resolved', color: 'text-emerald', dot: 'bg-emerald' },
};

export function AgentStateBadge({ status }: { status: ConversationStatus }) {
  const s = MAP[status];
  return (
    <div className="glass flex items-center gap-2 rounded-full px-4 py-2">
      <span className={clsx('h-2 w-2 rounded-full', s.dot, status === 'awaiting_human' && 'animate-pulse')} />
      <span className={clsx('font-mono text-xs uppercase tracking-[0.15em]', s.color)}>
        {s.label}
      </span>
    </div>
  );
}
