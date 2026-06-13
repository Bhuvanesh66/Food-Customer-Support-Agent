import { Color } from 'three';
import type { AgentState } from '../../store/useUIStore';

export type CoreVisual = {
  colorA: Color;
  colorB: Color;
  glow: number; // emissive multiplier
  pulse: number; // breathing amplitude
  distort: number; // surface noise amplitude
  spin: number; // rotation speed
  particleSpeed: number;
  particleColor: Color;
};

const CYAN = '#22d3ee';
const BLUE = '#3b82f6';
const EMERALD = '#10b981';
const WARNING = '#f59e0b';
const DEEP = '#0ea5b7';

// Each of the six states gets a distinct, recognisable signature.
export const CORE_STATES: Record<AgentState, CoreVisual> = {
  idle: {
    colorA: new Color(DEEP),
    colorB: new Color(BLUE),
    glow: 1.0,
    pulse: 0.4,
    distort: 0.06,
    spin: 0.12,
    particleSpeed: 0.15,
    particleColor: new Color(CYAN),
  },
  thinking: {
    colorA: new Color(CYAN),
    colorB: new Color(BLUE),
    glow: 1.35,
    pulse: 1.0,
    distort: 0.12,
    spin: 0.5,
    particleSpeed: 0.6,
    particleColor: new Color(CYAN),
  },
  retrieving: {
    colorA: new Color(BLUE),
    colorB: new Color(CYAN),
    glow: 1.3,
    pulse: 0.7,
    distort: 0.16,
    spin: 0.35,
    particleSpeed: -0.9, // stream inward
    particleColor: new Color(CYAN),
  },
  answering: {
    colorA: new Color(CYAN),
    colorB: new Color('#7dd3fc'),
    glow: 1.8,
    pulse: 0.6,
    distort: 0.1,
    spin: 0.28,
    particleSpeed: 0.9, // burst outward
    particleColor: new Color('#a5f3fc'),
  },
  escalating: {
    colorA: new Color(WARNING),
    colorB: new Color('#fb923c'),
    glow: 1.5,
    pulse: 0.8,
    distort: 0.14,
    spin: 0.4,
    particleSpeed: 0.5,
    particleColor: new Color(WARNING),
  },
  human: {
    colorA: new Color(EMERALD),
    colorB: new Color('#34d399'),
    glow: 1.2,
    pulse: 0.3,
    distort: 0.05,
    spin: 0.1,
    particleSpeed: 0.2,
    particleColor: new Color(EMERALD),
  },
};
