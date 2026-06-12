import { create } from 'zustand';

// The six visual states of the AI Core orb (per the design brief).
export type AgentState =
  | 'idle'
  | 'thinking'
  | 'retrieving'
  | 'answering'
  | 'escalating'
  | 'human';

type UIStore = {
  agentState: AgentState;
  setAgentState: (s: AgentState) => void;

  // Normalized cursor (-1..1) for parallax / orb light-follow.
  cursor: { x: number; y: number };
  setCursor: (x: number, y: number) => void;

  // Perf tier — detected once at boot, gates heavy 3D.
  perfTier: 'high' | 'low';
  setPerfTier: (t: 'high' | 'low') => void;
  reducedMotion: boolean;
};

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const useUIStore = create<UIStore>((set) => ({
  agentState: 'idle',
  setAgentState: (s) => set({ agentState: s }),

  cursor: { x: 0, y: 0 },
  setCursor: (x, y) => set({ cursor: { x, y } }),

  perfTier: 'high',
  setPerfTier: (t) => set({ perfTier: t }),
  reducedMotion: Boolean(prefersReduced),
}));
