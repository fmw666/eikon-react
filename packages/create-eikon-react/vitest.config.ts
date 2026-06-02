import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.{test,spec}.ts'],
    exclude: ['template/**', 'dist/**', 'node_modules/**'],
    passWithNoTests: true,
    // CI-only auto-retry to absorb transient flakes; 0 locally so real
    // failures are never masked during development.
    retry: process.env.CI ? 2 : 0,
  },
});
