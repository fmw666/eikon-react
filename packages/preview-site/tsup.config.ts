/**
 * @file tsup.config.ts
 * @description Bundle the production HTTP server into a single ESM file.
 *
 * Output is `dist-server/prod.js`, sitting next to Vite's `dist/` so the
 * relative resolution inside `prod.ts` (`__dirname/../dist`) works in
 * both local sanity-checks and the Fly image.
 *
 * `vite` is enormous (>100MB unpacked) and is needed at runtime by the
 * builder (it calls `viteBuild()` against each user-selected variant).
 * Bundling it would explode the output and break dynamic plugin loads;
 * we keep it as an external dep that lives in `node_modules` instead.
 *
 * The two `create-eikon-react` source modules we depend on
 * (`skip-list.ts`, `strip-features.ts`) are pulled in via relative paths
 * by `builder.ts` / `handlers.ts`, so tsup follows and inlines them
 * naturally — the runtime image does NOT need create-eikon-react's
 * source on disk for the server to work.
 */

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['server/prod.ts'],
  outDir: 'dist-server',
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  clean: true,
  splitting: false,
  sourcemap: false,
  // tsup defaults to externalizing every node_modules dep on `platform: 'node'`.
  // Spelling vite out here is purely documentation — keeps future readers
  // from "helpfully" bundling it and triggering Vite's own self-import checks.
  external: ['vite'],
});
