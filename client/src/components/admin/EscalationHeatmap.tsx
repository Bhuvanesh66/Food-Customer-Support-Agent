import { motion } from 'framer-motion';

/**
 * Escalation intensity by topic — glowing "islands" whose size + glow scale with
 * escalation frequency (not a grid heatmap, per the design brief).
 */
export function EscalationHeatmap({ data }: { data: Array<{ topic: string; n: number }> }) {
  if (data.length === 0) {
    return <div className="py-10 text-center text-sm text-muted">No escalations yet.</div>;
  }
  const max = Math.max(1, ...data.map((d) => d.n));
  return (
    <div className="flex flex-wrap items-end gap-5 py-4">
      {data.map((d, i) => {
        const intensity = d.n / max;
        const size = 48 + intensity * 70;
        return (
          <motion.div
            key={d.topic}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06, duration: 0.5 }}
            className="flex flex-col items-center gap-2"
          >
            <div
              className="relative rounded-full"
              style={{
                width: size,
                height: size,
                background: `radial-gradient(circle at 35% 30%, rgba(245,158,11,${0.35 + intensity * 0.5}), rgba(239,68,68,${0.15 + intensity * 0.3}))`,
                boxShadow: `0 0 ${20 + intensity * 40}px rgba(245,158,11,${0.3 + intensity * 0.4})`,
              }}
            >
              <span className="absolute inset-0 flex items-center justify-center font-mono text-sm text-ink">
                {d.n}
              </span>
            </div>
            <span className="text-xs text-muted">{d.topic}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
