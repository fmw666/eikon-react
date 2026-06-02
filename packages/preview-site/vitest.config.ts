import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    // Auto-retry flaky specs in CI only (e.g. the fake-timer debounce
    // hook that intermittently times out under CI scheduling). Locally
    // retry stays 0 so genuine failures surface immediately.
    retry: process.env.CI ? 2 : 0,
    environment: 'happy-dom',
    setupFiles: ['./__tests__/setup.ts'],
    include: [
      'src/**/__tests__/**/*.{test,spec}.{ts,tsx}',
      'server/**/__tests__/**/*.{test,spec}.ts',
      '__tests__/**/*.{test,spec}.{ts,tsx}',
    ],
    css: true,
  },
});
