// Shared, render-free spin controllers. The DOM drag handler writes velocity;
// the in-Canvas useFrame loop reads it. Module singletons keyed by scene so the
// handler (outside <Canvas>) and the 3D loop (inside) share the same object.

export type SpinController = {
  velocity: number; // radians/sec — applied each frame, decays on release
  dragging: boolean;
  idleSpin: number; // gentle drift when fully at rest (0 = perfectly still)
};

const controllers: Record<string, SpinController> = {};

export function getSpin(key: string, idleSpin = 0): SpinController {
  if (!controllers[key]) {
    controllers[key] = { velocity: 0, dragging: false, idleSpin };
  } else {
    controllers[key].idleSpin = idleSpin;
  }
  return controllers[key];
}

/** Kick a controller into a fast spin (e.g. on click); it then coasts to a stop. */
export function boostSpin(key: string, velocity = 5): void {
  const ctrl = controllers[key];
  if (ctrl && !ctrl.dragging) ctrl.velocity = velocity;
}

/**
 * Advance one frame. While dragging, velocity is driven by the pointer. On
 * release, the fling velocity coasts and decays toward `idleSpin` (0 = stops
 * completely). Returns the Y-rotation delta (radians) to apply this frame.
 */
export function stepSpin(ctrl: SpinController, delta: number): number {
  if (!ctrl.dragging) {
    // Exponential decay of the fling toward the idle drift (frictional coast).
    const friction = 2.2; // higher = stops sooner
    ctrl.velocity += (ctrl.idleSpin - ctrl.velocity) * Math.min(1, delta * friction);
    // Snap tiny residual to idle so it doesn't creep forever.
    if (Math.abs(ctrl.velocity - ctrl.idleSpin) < 0.001) ctrl.velocity = ctrl.idleSpin;
  }
  return ctrl.velocity * delta;
}
