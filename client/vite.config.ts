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
});
