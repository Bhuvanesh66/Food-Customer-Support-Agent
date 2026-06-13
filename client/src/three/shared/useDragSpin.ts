import { useEffect } from 'react';
import { getSpin } from './spinControllers';

/**
 * Drag-to-spin: attach to a DOM element (outside the Canvas). While the user
 * drags horizontally, the scene rotates 1:1 with the finger (move right → spin
 * right; pause → stops). On release, the last drag velocity becomes a fling that
 * coasts and decays to rest. The in-scene useFrame loop reads the same named
 * controller via getSpin()/stepSpin().
 */
export function useDragSpin(
  targetRef: React.RefObject<HTMLElement>,
  key: string,
  opts: { idleSpin?: number; sensitivity?: number } = {},
) {
  const sensitivity = opts.sensitivity ?? 3.5;

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const ctrl = getSpin(key, opts.idleSpin ?? 0);

    let lastX = 0;
    let lastT = 0;

    let captured = false;
    let pointerId = -1;
    let downX = 0;

    const onDown = (e: PointerEvent) => {
      ctrl.dragging = true;
      ctrl.velocity = 0; // grab — kill any coasting immediately
      lastX = e.clientX;
      downX = e.clientX;
      lastT = e.timeStamp;
      pointerId = e.pointerId;
      captured = false;
      el.style.cursor = 'grabbing';
    };

    const onMove = (e: PointerEvent) => {
      if (!ctrl.dragging) return;
      // Capture the pointer only once it's clearly a drag (>4px), so a plain
      // click still reaches the 3D nucleus click handler underneath.
      if (!captured && Math.abs(e.clientX - downX) > 4) {
        el.setPointerCapture?.(pointerId);
        captured = true;
      }
      const dx = e.clientX - lastX;
      const dt = Math.max(8, e.timeStamp - lastT) / 1000; // seconds (min clamp)
      lastX = e.clientX;
      lastT = e.timeStamp;
      ctrl.velocity = (dx / dt / window.innerWidth) * sensitivity;
    };

    // If the finger stops moving mid-drag, stop the spin (no residual velocity).
    let idleCheck: ReturnType<typeof setInterval> | null = null;
    const onDownStart = (e: PointerEvent) => {
      onDown(e);
      let prevX = e.clientX;
      idleCheck = setInterval(() => {
        if (!ctrl.dragging) return;
        if (Math.abs(lastX - prevX) < 0.5) ctrl.velocity = 0; // paused → stop
        prevX = lastX;
      }, 80);
    };

    const onUp = () => {
      if (!ctrl.dragging) return;
      ctrl.dragging = false; // release → velocity now coasts + decays in stepSpin
      if (captured && pointerId !== -1) {
        try {
          el.releasePointerCapture?.(pointerId);
        } catch {
          /* ignore */
        }
      }
      captured = false;
      el.style.cursor = 'grab';
      if (idleCheck) {
        clearInterval(idleCheck);
        idleCheck = null;
      }
    };

    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', onDownStart);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDownStart);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (idleCheck) clearInterval(idleCheck);
    };
  }, [targetRef, key, sensitivity, opts.idleSpin]);
}
