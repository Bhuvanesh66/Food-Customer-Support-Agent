import { clsx } from 'clsx';
import type { Sentiment, Urgency } from '../../store/useChatStore';

const MOOD: Record<Sentiment, { label: string; emoji: string; color: string }> = {
  positive: { label: 'Positive', emoji: '😊', color: 'text-emerald border-emerald/30 bg-emerald/10' },
  neutral: { label: 'Neutral', emoji: '🙂', color: 'text-muted border-hairline bg-white/5' },
  frustrated: { label: 'Frustrated', emoji: '😟', color: 'text-warning border-warning/30 bg-warning/10' },
  angry: { label: 'Angry', emoji: '😠', color: 'text-danger border-danger/30 bg-danger/10' },
};

/**
 * Live customer-mood indicator (Feature: Emotion-aware escalation). Shows the
 * sentiment the agent detected; a "high urgency" flag signals fast-track handoff.
 */
export function MoodChip({ sentiment, urgency }: { sentiment: Sentiment; urgency: Urgency }) {
  // Don't clutter the header until there's a non-default signal.
  if (sentiment === 'neutral' && urgency !== 'high') return null;
  const m = MOOD[sentiment];
  return (
    <div className={clsx('flex items-center gap-1.5 rounded-full border px-3 py-1.5', m.color)}>
      <span className="text-sm leading-none">{m.emoji}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.15em]">{m.label}</span>
      {urgency === 'high' && (
        <span className="ml-1 rounded-full bg-danger/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-danger">
          Urgent
        </span>
      )}
    </div>
  );
}
