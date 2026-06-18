import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import glsl from 'vite-plugin-glsl';

// Use 127.0.0.1 (not localhost) so the dev proxy doesn't resolve to IPv6 (::1),
// which the Express server (bound to IPv4) would refuse with ECONNREFUSED.
const API_TARGET = process.env.VITE_API_TARGET || 'http://127.0.0.1:8787';

export default defineConfig({
  plugins: [react(), glsl()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  build: {
    // Keep peak build memory down on constrained hosts (e.g. Render free 512MB):
    // disable source maps and split heavy libs into separate chunks so Rollup
    // doesn't hold one giant bundle in memory.
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          postprocessing: ['@react-three/postprocessing', 'postprocessing'],
          vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'zustand'],
        },
      },
    },
  },
});
