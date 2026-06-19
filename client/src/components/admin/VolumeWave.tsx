import { motion } from 'framer-motion';

/** A glowing area/bar wave of query volume per day (SVG, lightweight). */
export function VolumeWave({ data }: { data: Array<{ day: number; n: number }> }) {
  if (data.length === 0) {
    return <div className="py-10 text-center text-sm text-muted">No volume data yet.</div>;
  }
  const max = Math.max(1, ...data.map((d) => d.n));
  const W = 600;
  const H = 140;
  const step = data.length > 1 ? W / (data.length - 1) : W;
  const points = data.map((d, i) => {
    const x = i * step;
    const y = H - (d.n / max) * (H - 20) - 10;
    return [x, y] as const;
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  const area = `${path} L${W},${H} L0,${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="vw" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill="url(#vw)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />
      <motion.path
        d={path}
        fill="none"
        stroke="#22d3ee"
        strokeWidth={2}
        style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.6))' }}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1 }}
      />
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3} fill="#a5f3fc" />
      ))}
    </svg>
  );
}
