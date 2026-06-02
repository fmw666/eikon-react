import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.{test,spec}.ts'],
    exclude: ['template/**', 'dist/**', 'node_modules/**'],
    passWithNoTests: true,
    // CI-only auto-retry to absorb transient flakes; 0 locally so real
    // failures are never masked during development.
    retry: process.env.CI ? 2 : 0,
    // These are scaffold tests: each writes/copies/reads a tree of files on
    // disk. That's well under a second on Linux and dev boxes, but the
    // windows-latest CI runner's filesystem is slow enough that the heavier
    // cases (e.g. apply-ui-snapshot laying down every replaceable primitive)
    // can blow past Vitest's 5s default and flake the whole `verify` run.
    // Give the fs-bound work generous headroom: well above observed worst
    // case, low enough that a genuine hang still fails in reasonable time.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
