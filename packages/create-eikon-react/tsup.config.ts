import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  dts: false,
  splitting: false,
  shims: false,
  // Ship sourcemaps so a runtime error in a published CLI points at
  // the original `.ts` source instead of the minified-looking bundle.
  // Maps are tiny (~50KB total) and the support cost saved is worth
  // the tarball size. P5.10 in tech-debt-cleanup.
  sourcemap: true,
  banner: { js: '#!/usr/bin/env node' },
});
