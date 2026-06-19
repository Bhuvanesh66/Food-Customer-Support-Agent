import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { clsx } from 'clsx';
import { AdditiveBlending, Color, Group } from 'three';
import { useUIStore } from '../../store/useUIStore';
import { useDragSpin } from '../../three/shared/useDragSpin';
import { getSpin, stepSpin } from '../../three/shared/spinControllers';
import { SafeCanvas } from '../../three/shared/SafeCanvas';

export type Metric = {
  label: string;
  value: string;
  sub?: string;
  color: string;
};

/**
 * A single glowing glass orb.
 *  - hover → springy bounce
 *  - click → bounce kick + a ~1s self-spin (independent of the row drag-spin),
 *    and selects this metric (parent enlarges its label)
 */
function Orb({
  color,
  position,
  dragKey,
  onSelect,
}: {
  color: string;
  position: [number, number, number];
  dragKey: string;
  onSelect: () => void;
}) {
  const ref = useRef<Group>(null);
  const bounceRef = useRef<Group>(null);
  const c = new Color(color);
  const drag = getSpin(dragKey); // shared row drag-spin
  const selfSpin = useRef(0); // per-orb click spin, decays to 0
  const hovered = useRef(false);
  const bounceT = useRef(0);
  const clickPop = useRef(0); // extra bounce energy on click

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05);

    // Rotation = shared drag-spin + this orb's own click spin (decaying).
    selfSpin.current += (0 - selfSpin.current) * Math.min(1, d * 1.6); // ~1s decay
    if (Math.abs(selfSpin.current) < 0.002) selfSpin.current = 0;
    if (ref.current) ref.current.rotation.y += stepSpin(drag, d) + selfSpin.current * d;

    if (bounceRef.current) {
      let target = 1;
      if (hovered.current) {
        bounceT.current += d;
        const pop = Math.sin(bounceT.current * 12) * Math.exp(-bounceT.current * 4);
        target = 1.12 + pop * 0.16;
      } else {
        bounceT.current = 0;
      }
      // Click adds a sharp extra pop that decays fast.
      clickPop.current += (0 - clickPop.current) * Math.min(1, d * 6);
      target += clickPop.current;
      const cur = bounceRef.current.scale.x;
      const next = cur + (target - cur) * Math.min(1, d * 14);
      bounceRef.current.scale.setScalar(next);
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0} floatIntensity={0.7}>
      <group
        ref={bounceRef}
        position={position}
        onPointerOver={(e) => {
          e.stopPropagation();
          hovered.current = true;
          bounceT.current = 0;
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          hovered.current = false;
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          selfSpin.current = 9; // fast self-spin, decays over ~1s
          clickPop.current = 0.35; // extra bounce kick
          onSelect();
        }}
      >
        <group ref={ref}>
          <mesh>
            <icosahedronGeometry args={[0.62, 6]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.9} roughness={0.25} metalness={0.3} transparent opacity={0.9} />
          </mesh>
          <mesh scale={1.25}>
            <icosahedronGeometry args={[0.62, 3]} />
            <meshBasicMaterial color={c} wireframe transparent opacity={0.18} depthWrite={false} blending={AdditiveBlending} />
          </mesh>
          <mesh scale={1.55}>
            <sphereGeometry args={[0.62, 24, 24]} />
            <meshBasicMaterial color={c} transparent opacity={0.06} depthWrite={false} blending={AdditiveBlending} />
          </mesh>
        </group>
      </group>
    </Float>
  );
}

export function MetricIslands({ metrics }: { metrics: Metric[] }) {
  const high = useUIStore((s) => s.perfTier) === 'high';
  const four = metrics.slice(0, 4);
  const xs = [-3.3, -1.1, 1.1, 3.3];
  const wrap = useRef<HTMLDivElement>(null);
  const [pulsed, setPulsed] = useState<number | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Row drag-spin (spins all orbs together); orbs sit still until dragged.
  useDragSpin(wrap, 'admin-metrics', { idleSpin: 0, sensitivity: 4 });

  // Enlarge the clicked metric momentarily, then ease it back to normal.
  const pulse = (i: number) => {
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    setPulsed(i);
    pulseTimer.current = setTimeout(() => setPulsed(null), 900);
  };

  return (
    <div ref={wrap} className="relative h-[240px] w-full select-none">
      <div className="absolute inset-0">
        <SafeCanvas camera={{ position: [0, 0, 7], fov: 46 }} dpr={high ? [1, 1.8] : [1, 1.2]}>
          <ambientLight intensity={0.6} />
          <pointLight position={[0, 3, 5]} intensity={26} color="#22d3ee" />
          <pointLight position={[-4, -2, 3]} intensity={12} color="#3b82f6" />
          {four.map((m, i) => (
            <Orb
              key={m.label}
              color={m.color}
              position={[xs[i], 0.35, 0]}
              dragKey="admin-metrics"
              onSelect={() => pulse(i)}
            />
          ))}
        </SafeCanvas>
      </div>

      <div className="pointer-events-none absolute inset-0 grid grid-cols-4 items-end pb-3">
        {four.map((m, i) => {
          const active = pulsed === i;
          return (
            <div
              key={m.label}
              className={clsx(
                'flex origin-bottom flex-col items-center text-center transition-transform duration-500 ease-out',
                active ? 'scale-[1.18]' : 'scale-100',
              )}
            >
              <div
                className="font-mono text-4xl font-semibold leading-none transition-all duration-300"
                style={{
                  color: m.color,
                  textShadow: active ? `0 0 36px ${m.color}` : `0 0 24px ${m.color}66`,
                }}
              >
                {m.value}
              </div>
              <div className={clsx('mt-2 text-sm transition-colors', active ? 'text-ink' : 'text-ink/90')}>
                {m.label}
              </div>
              {m.sub && <div className="mt-0.5 text-[11px] text-muted">{m.sub}</div>}
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none absolute right-3 top-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan/40">
        ⟲ drag · click an orb
      </div>
    </div>
  );
}
