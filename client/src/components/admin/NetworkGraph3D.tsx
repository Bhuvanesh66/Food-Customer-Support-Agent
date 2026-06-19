import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Color, Group } from 'three';
import { useUIStore } from '../../store/useUIStore';
import { SafeCanvas } from '../../three/shared/SafeCanvas';

type Node = { topic: string; n: number };

function GraphInner({ nodes }: { nodes: Node[] }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.12;
  });

  const placed = useMemo(() => {
    const max = Math.max(1, ...nodes.map((n) => n.n));
    const R = 2.6;
    return nodes.map((node, i) => {
      // Fibonacci-sphere-ish distribution.
      const phi = Math.acos(1 - (2 * (i + 0.5)) / Math.max(1, nodes.length));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const pos: [number, number, number] = [
        R * Math.sin(phi) * Math.cos(theta),
        R * Math.cos(phi) * 0.7,
        R * Math.sin(phi) * Math.sin(theta),
      ];
      const scale = 0.18 + (node.n / max) * 0.32;
      return { ...node, pos, scale };
    });
  }, [nodes]);

  const cyan = useMemo(() => new Color('#22d3ee'), []);

  return (
    <group ref={group}>
      {/* central hub */}
      <mesh>
        <icosahedronGeometry args={[0.45, 2]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.8} wireframe />
      </mesh>
      {placed.map((node) => (
        <group key={node.topic} position={node.pos}>
          <mesh>
            <icosahedronGeometry args={[node.scale, 2]} />
            <meshStandardMaterial color={cyan} emissive={cyan} emissiveIntensity={0.6} />
          </mesh>
          <Html distanceFactor={8} position={[0, node.scale + 0.25, 0]} style={{ pointerEvents: 'none' }}>
            <div className="graph-node-label">
              {node.topic} <span>{node.n}</span>
            </div>
          </Html>
          {/* spoke to hub */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array([0, 0, 0, -node.pos[0], -node.pos[1], -node.pos[2]]), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color={cyan} transparent opacity={0.18} />
          </line>
        </group>
      ))}
    </group>
  );
}

export function NetworkGraph3D({ nodes }: { nodes: Node[] }) {
  const high = useUIStore((s) => s.perfTier) === 'high';
  if (nodes.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted">
        No topic data yet — run a few conversations.
      </div>
    );
  }
  return (
    <div className="h-[320px] w-full">
      <SafeCanvas camera={{ position: [0, 0, 7], fov: 46 }} dpr={high ? [1, 1.8] : [1, 1.2]}>
        <ambientLight intensity={0.6} />
        <pointLight position={[4, 4, 4]} intensity={22} color="#22d3ee" />
        <GraphInner nodes={nodes} />
      </SafeCanvas>
    </div>
  );
}
