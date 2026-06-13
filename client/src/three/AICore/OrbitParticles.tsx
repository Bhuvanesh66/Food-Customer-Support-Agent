import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Points } from 'three';

type Props = {
  count?: number;
  radius?: number;
  speed: number;
  color: Color;
};

/**
 * Particles orbiting the AI core on tilted rings. `speed` sign controls
 * direction (negative = stream inward look during retrieval).
 */
export function OrbitParticles({ count = 280, radius = 1.7, speed, color }: Props) {
  const ref = useRef<Points>(null);

  const { geometry, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seedArr = new Float32Array(count * 3); // ringRadius, phase, inclination
    for (let i = 0; i < count; i++) {
      const r = radius * (0.8 + Math.random() * 0.5);
      const phase = Math.random() * Math.PI * 2;
      const incl = (Math.random() - 0.5) * Math.PI;
      seedArr[i * 3 + 0] = r;
      seedArr[i * 3 + 1] = phase;
      seedArr[i * 3 + 2] = incl;
      positions[i * 3 + 0] = Math.cos(phase) * r;
      positions[i * 3 + 1] = Math.sin(incl) * r * 0.4;
      positions[i * 3 + 2] = Math.sin(phase) * r;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return { geometry: geo, seeds: seedArr };
  }, [count, radius]);

  useFrame((_, delta) => {
    const pts = ref.current;
    if (!pts) return;
    const pos = pts.geometry.getAttribute('position') as Float32BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const r = seeds[i * 3 + 0];
      let phase = seeds[i * 3 + 1] + delta * speed * (1.2 - r * 0.3);
      seeds[i * 3 + 1] = phase;
      const incl = seeds[i * 3 + 2];
      arr[i * 3 + 0] = Math.cos(phase) * r;
      arr[i * 3 + 1] = Math.sin(incl + phase * 0.3) * r * 0.4;
      arr[i * 3 + 2] = Math.sin(phase) * r;
    }
    pos.needsUpdate = true;
    pts.rotation.y += delta * 0.05;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={0.035}
        color={color}
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
