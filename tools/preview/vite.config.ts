import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Standalone. Deliberately not part of `electron.vite.config.ts`: this must
 * keep working when the app itself cannot start.
 */
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: { port: 5199, strictPort: true },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../src/renderer/src'),
      '@shared': resolve(__dirname, '../../src/shared'),
      // Same target as electron.vite.config.ts: the brand assets live in docs.
      '@brand': resolve(__dirname, '../../docs')
    }
  }
});
