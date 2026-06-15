import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Group } from 'three';
import { AICore } from './AICore/AICore';
import { NeuralField } from './Background/NeuralField';
import { useUIStore } from '../store/useUIStore';
import { SafeCanvas } from './shared/SafeCanvas';
import { getSpin, stepSpin, boostSpin } from './shared/spinControllers';

type PanelDef = {
  angle: number; // position around the orb (radians)
  radius: number;
  y: number;
  node: React.ReactNode;
};

const PANELS: PanelDef[] = [
  {
    angle: Math.PI * 0.85,
    radius: 3.0,
    y: 1.4,
    node: (
      <div className="hero-panel">
        <div className="hero-panel-label">Knowledge Base</div>
        <div className="hero-panel-row"><span>📄 PDFs</span><span className="dot" /></div>
        <div className="hero-panel-row"><span>❓ FAQs</span><span className="dot" /></div>
        <div className="hero-panel-row"><span>🎫 Tickets</span><span className="dot" /></div>
        <div className="hero-panel-row"><span>🔗 URLs</span><span className="dot" /></div>
        <div className="hero-panel-foot">→ embeddings · vector nodes</div>
      </div>
    ),
  },
  {
    angle: Math.PI * 0.15,
    radius: 3.0,
    y: 0.7,
    node: (
      <div className="hero-panel hero-panel-wide">
        <div className="hero-panel-label">Live Resolution</div>
        <div className="hero-chat-user">“My order is late.”</div>
        <div className="hero-chat-ai">Your courier is 8 min away — here's the live map &amp; a credit.</div>
        <div className="hero-chat-meta">
          <span className="conf">✓ Confidence 96%</span>
          <span className="resolved">● Resolved</span>
        </div>
      </div>
    ),
  },
  {
    angle: Math.PI * 1.25,
    radius: 3.0,
    y: -1.9,
    node: (
      <div className="hero-panel">
        <div className="hero-panel-label">Human Handoff</div>
        <div className="hero-flow">
          <span>AI</span><span className="arrow">→</span>
          <span className="capsule">Context</span><span className="arrow">→</span>
          <span>Agent</span>
        </div>
        <div className="hero-panel-foot">full context · zero re-reading</div>
      </div>
    ),
  },
];

/**
 * The panels + neural field orbit the orb as a group. The group's Y-rotation is
 * driven by the shared 'hero' spin controller — swipe horizontally to spin it
 * fast, release and it eases back to a gentle idle drift. Each panel
 * counter-rotates so its text always faces the viewer.
 */
function OrbitingScene({ high }: { high: boolean }) {
  const orbit = useRef<Group>(null);
  const panelRefs = useRef<(Group | null)[]>([]);
  const spin = getSpin('hero'); // idle set by useDragSpin; just read it here

  useFrame((_, delta) => {
    const d = stepSpin(spin, Math.min(delta, 0.05));
    if (orbit.current) {
      orbit.current.rotation.y += d;
      // Counter-rotate each panel so HTML stays readable while orbiting.
      const total = orbit.current.rotation.y;
      panelRefs.current.forEach((p) => {
        if (p) p.rotation.y = -total;
      });
    }
  });

  return (
    <>
      <AICore scale={1.05} particles={high} />
      {/* Invisible click target over the nucleus: click → spin fast ~2s, then stop. */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          boostSpin('hero', 5);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
        <sphereGeometry args={[1.15, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={orbit}>
        <NeuralField count={high ? 80 : 40} />
        {PANELS.map((p, i) => (
          <group
            key={i}
            position={[Math.cos(p.angle) * p.radius, p.y, Math.sin(p.angle) * p.radius]}
          >
            <group ref={(el) => (panelRefs.current[i] = el)}>
              <Html transform distanceFactor={6} occlude={false} style={{ pointerEvents: 'none' }}>
                {p.node}
              </Html>
            </group>
          </group>
        ))}
      </group>
    </>
  );
}

export default function HeroScene() {
  const high = useUIStore((s) => s.perfTier) === 'high';

  return (
    <SafeCanvas camera={{ position: [0, 0, 8], fov: 46 }} dpr={high ? [1, 2] : [1, 1.3]}>
      <color attach="background" args={['#070b14']} />
      <fog attach="fog" args={['#070b14', 11, 24]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 4, 4]} intensity={30} color="#22d3ee" />
      <pointLight position={[-5, -2, 2]} intensity={18} color="#3b82f6" />

      <OrbitingScene high={high} />

      {high && (
        <EffectComposer enableNormalPass={false}>
          <Bloom intensity={0.9} luminanceThreshold={0.2} luminanceSmoothing={0.4} mipmapBlur radius={0.7} />
          <Vignette eskil={false} offset={0.25} darkness={0.85} />
        </EffectComposer>
      )}
    </SafeCanvas>
  );
}
