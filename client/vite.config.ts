import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import glsl from 'vite-plugin-glsl';

const API_TARGET = process.env.VITE_API_TARGET || 'http://localhost:8787';

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
