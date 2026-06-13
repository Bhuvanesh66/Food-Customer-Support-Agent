import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, Group, ShaderMaterial, MathUtils } from 'three';
import { useUIStore } from '../../store/useUIStore';
import { CORE_STATES, type CoreVisual } from './states';
import { OrbitParticles } from './OrbitParticles';
import vertexShader from './coreVertex.glsl';
import fragmentShader from './coreFragment.glsl';

type Props = {
  scale?: number;
  /** Disable particles on low perf tiers. */
  particles?: boolean;
};

/**
 * The signature AI Core orb: a GLSL-shaded glass sphere whose color, glow,
 * pulse, and surface distortion smoothly interpolate between six agent states,
 * wrapped in translucent glass shells and orbiting particles. Cursor-reactive.
 */
export function AICore({ scale = 1, particles = true }: Props) {
  const group = useRef<Group>(null);
  const matRef = useRef<ShaderMaterial>(null);
  const agentState = useUIStore((s) => s.agentState);
  const cursor = useUIStore((s) => s.cursor);

  // Live (interpolated) visual values.
  const live = useRef<CoreVisual>({
    ...CORE_STATES.idle,
    colorA: CORE_STATES.idle.colorA.clone(),
    colorB: CORE_STATES.idle.colorB.clone(),
    particleColor: CORE_STATES.idle.particleColor.clone(),
  });
  const particleColor = useRef(new Color());

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPulse: { value: 0.4 },
      uDistort: { value: 0.06 },
      uGlow: { value: 1.0 },
      uColorA: { value: new Color(CORE_STATES.idle.colorA) },
      uColorB: { value: new Color(CORE_STATES.idle.colorB) },
    }),
    [],
  );

  useFrame((state, delta) => {
    const target = CORE_STATES[agentState];
    const k = Math.min(1, delta * 3); // smoothing factor

    live.current.glow = MathUtils.lerp(live.current.glow, target.glow, k);
    live.current.pulse = MathUtils.lerp(live.current.pulse, target.pulse, k);
    live.current.distort = MathUtils.lerp(live.current.distort, target.distort, k);
    live.current.spin = MathUtils.lerp(live.current.spin, target.spin, k);
    live.current.particleSpeed = MathUtils.lerp(live.current.particleSpeed, target.particleSpeed, k);
    live.current.colorA.lerp(target.colorA, k);
    live.current.colorB.lerp(target.colorB, k);
    particleColor.current.lerp(target.particleColor, k);

    if (matRef.current) {
      const u = matRef.current.uniforms;
      u.uTime.value = state.clock.elapsedTime;
      u.uPulse.value = live.current.pulse;
      u.uDistort.value = live.current.distort;
      u.uGlow.value = live.current.glow;
      (u.uColorA.value as Color).copy(live.current.colorA);
      (u.uColorB.value as Color).copy(live.current.colorB);
    }

    if (group.current) {
      group.current.rotation.y += delta * live.current.spin;
      // Cursor-reactive parallax tilt + gentle float.
      const tx = cursor.y * 0.25;
      const ty = cursor.x * 0.4;
      group.current.rotation.x = MathUtils.lerp(group.current.rotation.x, tx, 0.05);
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.06;
      group.current.position.x = MathUtils.lerp(group.current.position.x, ty * 0.15, 0.05);
    }
  });

  return (
    <group ref={group} scale={scale}>
      {/* Core shader sphere */}
      <mesh>
        <icosahedronGeometry args={[1, 48]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* Translucent glass shells for layered depth */}
      <mesh scale={1.18}>
        <icosahedronGeometry args={[1, 24]} />
        <meshBasicMaterial
          color={live.current.colorB}
          transparent
          opacity={0.06}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh scale={1.4}>
        <icosahedronGeometry args={[1, 12]} />
        <meshBasicMaterial
          color={live.current.colorA}
          wireframe
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>

      {particles && (
        <OrbitParticles speed={live.current.particleSpeed} color={particleColor.current} />
      )}
    </group>
  );
}
