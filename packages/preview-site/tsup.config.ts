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
  // The prod server AND the Docker-time variant pre-baker share this
  // bundle config so the latter sees an identical resolution graph
  // (incl. the inlined `create-eikon-react/src/strip-features.ts`).
  // Both produce single-file ESM bundles in dist-server/.
  //
  // Entry names are explicit so tsup writes flat files
  // (`dist-server/prod.js`, `dist-server/prebuild-variants.js`) rather
  // than mirroring the source-tree layout (`dist-server/server/prod.js`,
  // `dist-server/scripts/prebuild-variants.js`) — the prod CMD and the
  // package.json `prebuild-variants` script both reference the flat
  // paths.
  entry: {
    prod: 'server/prod.ts',
    'prebuild-variants': 'scripts/prebuild-variants.ts',
  },
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
