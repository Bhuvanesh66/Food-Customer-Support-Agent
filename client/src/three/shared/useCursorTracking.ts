import { useEffect } from 'react';
import { useUIStore } from '../../store/useUIStore';

/**
 * Track the cursor as a normalized (-1..1) vector in the UI store so any 3D
 * scene can react with parallax / light-follow. Attach once near the app root.
 */
export function useCursorTracking() {
  const setCursor = useUIStore((s) => s.setCursor);
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setCursor(x, y);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [setCursor]);
}
