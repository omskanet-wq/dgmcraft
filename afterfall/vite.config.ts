import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Splits the heavy three.js bundle into its own chunk so the React shell can
// stream in first and the menu shows immediately on slow phones.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id: string): string | undefined {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react';
          if (id.includes('node_modules/zustand')) return 'zustand';
          return undefined;
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
  },
});
