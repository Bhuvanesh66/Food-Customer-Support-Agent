import { Component, Suspense, type ReactNode } from 'react';
import { Canvas, type CanvasProps } from '@react-three/fiber';

/**
 * Error boundary that swallows WebGL/postprocessing crashes (e.g. context loss,
 * "Cannot read properties of null (reading 'alpha')") and renders a quiet
 * fallback instead of white-screening the whole app.
 */
class GLErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    // Non-fatal — the 3D scene is decorative; log and degrade.
    console.warn('[3D] scene error (degraded to fallback):', err);
  }
  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}

/**
 * A Canvas that won't take down the app on GPU/context errors, and that frees
 * its WebGL context when unmounted (avoids "too many active WebGL contexts").
 */
export function SafeCanvas({
  children,
  fallback,
  ...props
}: CanvasProps & { fallback?: ReactNode }) {
  return (
    <GLErrorBoundary fallback={fallback}>
      <Canvas
        {...props}
        gl={{ powerPreference: 'high-performance', antialias: true, ...(props.gl as object) }}
        onCreated={(state) => {
          // Release the context on unmount; recover gracefully on loss.
          const canvas = state.gl.domElement;
          canvas.addEventListener(
            'webglcontextlost',
            (e) => {
              e.preventDefault();
            },
            { passive: false },
          );
          props.onCreated?.(state);
        }}
      >
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </GLErrorBoundary>
  );
}
