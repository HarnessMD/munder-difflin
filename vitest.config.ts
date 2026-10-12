import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Pure unit tests only (no Electron, no Pixi window). Restricted to
// test/themes so vitest never picks up the repo's node:test *.test.cjs files.
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@brand': resolve(__dirname, 'docs'),
    },
  },
  test: {
    include: ['test/themes/**/*.test.ts'],
    environment: 'node',
  },
});
