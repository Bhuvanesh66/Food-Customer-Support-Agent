import { Link } from 'react-router-dom';
import { Suspense, lazy, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowButton } from '../components/ui/GlowButton';
import { hasWebGL } from '../three/shared/usePerfDetect';
import { useDragSpin } from '../three/shared/useDragSpin';

const HeroScene = lazy(() => import('../three/HeroScene'));

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 * i, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function Landing() {
  const webgl = hasWebGL();
  const sceneRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  // Swipe horizontally on the 3D area to spin the orbiting panels around the orb.
  // idleSpin: 0 → the panels sit still until you actually drag.
  useDragSpin(sceneRef, 'hero', { idleSpin: 0, sensitivity: 4 });

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient mesh-gradient background (CSS, always present) */}
      <div className="pointer-events-none absolute inset-0 z-0 mesh-bg" />

      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Left — editorial hero */}
        <div className="flex flex-col justify-center px-8 py-16 lg:px-16">
          <motion.span
            custom={0}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-hairline bg-glass px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-cyan"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan shadow-glow-sm" />
            Synapse&nbsp;AI
          </motion.span>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="font-display text-5xl font-bold leading-[1.04] text-ink lg:text-7xl"
          >
            Support that
            <br />
            thinks before
            <br />
            <span className="glow-text text-cyan">it speaks.</span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mt-6 max-w-md font-body text-lg text-muted"
          >
            A context-aware AI agent that resolves issues autonomously over your
            knowledge base — and escalates the rest to a human with full context.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mt-10 flex flex-wrap gap-4"
          >
            <Link to="/chat">
              <GlowButton>Start a conversation</GlowButton>
            </Link>
            <Link to="/admin">
              <GlowButton variant="ghost">Admin console</GlowButton>
            </Link>
          </motion.div>
        </div>

        {/* Right — 3D scene (or graceful fallback) */}
        <div
          ref={sceneRef}
          onPointerEnter={() => setHovering(true)}
          onPointerLeave={() => setHovering(false)}
          className="absolute inset-0 touch-pan-y select-none overflow-hidden lg:relative lg:inset-auto"
        >
          {webgl && (
            <AnimatePresence>
              {hovering && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.35 }}
                  className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-cyan/25 bg-black/40 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-cyan/90 backdrop-blur-md"
                >
                  ⟲ drag to orbit · click the core to spin
                </motion.div>
              )}
            </AnimatePresence>
          )}
          {webgl ? (
            <Suspense fallback={<div className="h-full w-full" />}>
              <HeroScene />
            </Suspense>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="h-48 w-48 animate-pulse-slow rounded-full bg-gradient-to-br from-cyan/40 to-blue/30 blur-2xl" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
