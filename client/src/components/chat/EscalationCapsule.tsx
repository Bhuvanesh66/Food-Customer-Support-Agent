import { motion } from 'framer-motion';
import { ArrowRight, UserRound, Sparkles, FileText } from 'lucide-react';
import type { Source } from '../../types';

type HandoffSummary = {
  userIssue: string;
  conversationSummary: string;
  attemptedAnswer: string;
  retrievedSources: Source[];
  confidence: number;
  suggestedNextSteps: string[];
  sentiment?: string;
};

/**
 * Plays the AI → context-capsule → human handoff and shows the structured
 * summary the human agent receives, so the customer feels the reassuring
 * transition (and admins can see exactly what was captured).
 */
export function EscalationCapsule({ summary }: { summary: HandoffSummary }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="glass mx-auto w-full max-w-xl rounded-2xl border-warning/25 p-5"
    >
      {/* Handoff flow animation */}
      <div className="mb-5 flex items-center justify-center gap-3">
        <Flow icon={<Sparkles size={16} />} label="Synapse AI" color="text-cyan" />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1] }}
          transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
        >
          <ArrowRight size={16} className="text-warning" />
        </motion.div>
        <Flow icon={<FileText size={16} />} label="Context" color="text-warning" capsule />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1] }}
          transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5, delay: 0.3 }}
        >
          <ArrowRight size={16} className="text-warning" />
        </motion.div>
        <Flow icon={<UserRound size={16} />} label="Human Agent" color="text-emerald" />
      </div>

      <Field label="Issue" value={summary.userIssue} />
      <Field label="What I tried" value={summary.attemptedAnswer} />
      {summary.retrievedSources?.length > 0 && (
        <div className="mb-3">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
            Sources reviewed
          </div>
          <div className="flex flex-wrap gap-1.5">
            {summary.retrievedSources.map((s) => (
              <span key={s.documentId} className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-cyan">
                {s.title}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted">
        <span>confidence {(summary.confidence * 100).toFixed(0)}%</span>
        <span className="text-warning">queued for a human agent</span>
      </div>
    </motion.div>
  );
}

function Flow({
  icon,
  label,
  color,
  capsule,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  capsule?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-${capsule ? 'full' : 'xl'} border border-white/10 bg-white/5 ${color}`}
      >
        {icon}
      </div>
      <span className="text-[10px] text-muted">{label}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3">
      <div className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
        {label}
      </div>
      <div className="text-sm text-ink">{value}</div>
    </div>
  );
}
