import { SafeCanvas } from './shared/SafeCanvas';
import { AICore } from './AICore/AICore';
import { useUIStore } from '../store/useUIStore';

/**
 * Compact AI Core orb used as the live chat avatar. Shares the same state-driven
 * animation as the hero orb (via the UI store). No postprocessing here — bloom on
 * many small canvases exhausts WebGL contexts; the shader glow is enough.
 */
export function OrbAvatar({ size = 160 }: { size?: number }) {
  const high = useUIStore((s) => s.perfTier) === 'high';
  return (
    <div style={{ width: size, height: size }} className="shrink-0">
      <SafeCanvas
        camera={{ position: [0, 0, 3.4], fov: 45 }}
        dpr={high ? [1, 1.8] : [1, 1.2]}
        fallback={
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-20 w-20 animate-pulse rounded-full bg-cyan/30 blur-xl" />
          </div>
        }
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[3, 3, 3]} intensity={18} color="#22d3ee" />
        <AICore scale={0.95} particles={high} />
      </SafeCanvas>
    </div>
  );
}
