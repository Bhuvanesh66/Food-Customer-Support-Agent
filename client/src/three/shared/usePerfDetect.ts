import { useEffect } from 'react';
import { useUIStore } from '../../store/useUIStore';

/**
 * One-time WebGL capability + device-tier probe. Downgrades to the 'low' perf
 * tier (lighter scenes, no bloom/particles) on weak GPUs or when WebGL is
 * unavailable, so the immersive UI never tanks on low-end machines.
 */
export function usePerfDetect() {
  const setPerfTier = useUIStore((s) => s.setPerfTier);
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl =
        (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
        (canvas.getContext('webgl') as WebGLRenderingContext | null);
      if (!gl) {
        setPerfTier('low');
        return;
      }
      const cores = navigator.hardwareConcurrency ?? 4;
      const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 4;
      const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      if (mobile || cores <= 4 || mem <= 4) {
        setPerfTier('low');
      } else {
        setPerfTier('high');
      }
    } catch {
      setPerfTier('low');
    }
  }, [setPerfTier]);
}

/** Returns true if WebGL is available at all (for the hard fallback). */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') || canvas.getContext('webgl'),
    );
  } catch {
    return false;
  }
}
