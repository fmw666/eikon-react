import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `@tests` (note: plural is reserved for vitest itself) targets the
      // workspace-level __tests__ folder so feature tests can import shared
      // helpers from one short path instead of climbing six levels of `..`.
      '@test': fileURLToPath(new URL('./__tests__', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./__tests__/setup.ts'],
    include: [
      'src/**/__tests__/**/*.{test,spec}.{ts,tsx}',
      '__tests__/**/*.{test,spec}.{ts,tsx}',
    ],
    // Browser-mode specs live under __tests__/browser/ and run via
    // `pnpm test:browser` (vitest.browser.config.ts). They require a
    // real Chromium and explicit setup; default `pnpm test` skips them.
    exclude: ['__tests__/browser/**', 'node_modules', 'dist', '.preview-cache'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/main.tsx',
        'src/**/types.ts',
      ],
    },
  },
});
