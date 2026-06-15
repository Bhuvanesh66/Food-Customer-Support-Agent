import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineSegments,
  Points,
  Group,
} from 'three';

type Props = {
  count?: number;
  /** Max distance for drawing a connecting "synapse" line. */
  linkDistance?: number;
};

/**
 * Ambient neural network: drifting nodes with faint connecting lines that form
 * and dissolve as nodes move — the "living intelligence" backdrop.
 */
export function NeuralField({ count = 90, linkDistance = 2.4 }: Props) {
  const group = useRef<Group>(null);
  const lines = useRef<LineSegments>(null);

  const { positions, velocities, pointsGeo } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const spread = 14;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.7;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread - 4;
      vel[i * 3 + 0] = (Math.random() - 0.5) * 0.12;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.12;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    return { positions: pos, velocities: vel, pointsGeo: geo };
  }, [count]);

  // Preallocate a generous line buffer.
  const lineGeo = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * count * 3), 3));
    return geo;
  }, [count]);

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05);
    for (let i = 0; i < count; i++) {
      for (let a = 0; a < 3; a++) {
        const idx = i * 3 + a;
        positions[idx] += velocities[idx] * d * 8;
        const limit = a === 1 ? 5 : 7;
        if (positions[idx] > limit || positions[idx] < -limit - (a === 2 ? 4 : 0)) {
          velocities[idx] *= -1;
        }
      }
    }
    (pointsGeo.getAttribute('position') as Float32BufferAttribute).needsUpdate = true;

    // Rebuild connecting lines for nearby nodes.
    const linePos = lineGeo.getAttribute('position').array as Float32Array;
    let ptr = 0;
    const maxSq = linkDistance * linkDistance;
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < maxSq) {
          linePos[ptr++] = positions[i * 3];
          linePos[ptr++] = positions[i * 3 + 1];
          linePos[ptr++] = positions[i * 3 + 2];
          linePos[ptr++] = positions[j * 3];
          linePos[ptr++] = positions[j * 3 + 1];
          linePos[ptr++] = positions[j * 3 + 2];
        }
      }
    }
    lineGeo.setDrawRange(0, ptr / 3);
    lineGeo.getAttribute('position').needsUpdate = true;

    if (group.current) group.current.rotation.y += d * 0.02;
  });

  const cyan = useMemo(() => new Color('#22d3ee'), []);

  return (
    <group ref={group}>
      <points geometry={pointsGeo}>
        <pointsMaterial
          size={0.06}
          color={cyan}
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
      <lineSegments ref={lines} geometry={lineGeo}>
        <lineBasicMaterial color={cyan} transparent opacity={0.12} depthWrite={false} blending={AdditiveBlending} />
      </lineSegments>
    </group>
  );
}
