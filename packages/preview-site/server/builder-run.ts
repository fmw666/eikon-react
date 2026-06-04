import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { applyUiSnapshot } from '../../create-eikon-react/src/apply-ui-snapshot';
import {
  stripFeatures,
  type FeatureFlags,
  type VariantSelections,
} from '../../create-eikon-react/src/strip-features';

import {
  COPY_SKIP,
  getBuildOkPath,
  getCacheDir,
  RM_OPTS,
  TEMPLATE_REACT_DIR,
  UI_SNAPSHOTS_ROOT,
} from './builder-paths';
import type { BuildInputs } from './hash';
import { copyTree } from './copy-tree';
import { BUILD_CONCURRENCY } from './builder-config';
import { BUILD_TIMEOUT_MS, runViteBuild, withTimeout } from './vite-runner';

/**
 * Internal to the builder. The actual scaffold-and-vite-build pipeline plus
 * the FIFO concurrency semaphore (P4.5/P4.6) that caps how many vite builds
 * run at once. `builder.ts` calls `runBuildGated` from `ensureBuild`.
 */

/**
 * Counting-semaphore state for P4.6. `buildSlotsInUse` tracks active
 * runBuild calls; `buildWaiters` is a FIFO of resolvers awaiting a slot.
 */
let buildSlotsInUse = 0;
const buildWaiters: Array<() => void> = [];

/**
 * P4.5 + P4.6: queue-and-cap wrapper around `runBuild`. Acquires one
 * of `BUILD_CONCURRENCY` slots before starting the actual build, and
 * imposes a `BUILD_TIMEOUT_MS` ceiling on the inner work.
 *
 * The slot is released in a `finally` so a thrown error (timeout, vite
 * crash, fs failure) can't leak the slot. The semaphore is FIFO via the
 * `buildWaiters` queue.
 */
export async function runBuildGated(
  hash: string,
  inputs: BuildInputs
): Promise<void> {
  await acquireBuildSlot();
  try {
    await withTimeout(runBuild(hash, inputs), BUILD_TIMEOUT_MS, hash);
  } finally {
    releaseBuildSlot();
  }
}

function acquireBuildSlot(): Promise<void> {
  if (buildSlotsInUse < BUILD_CONCURRENCY) {
    buildSlotsInUse += 1;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    buildWaiters.push(() => {
      buildSlotsInUse += 1;
      resolve();
    });
  });
}

function releaseBuildSlot(): void {
  buildSlotsInUse -= 1;
  const next = buildWaiters.shift();
  if (next) next();
}

async function runBuild(hash: string, inputs: BuildInputs): Promise<void> {
  const cacheDir = getCacheDir(hash);

  // Drop any half-built leftover so we always start from a clean tree. A
  // ready dist would've short-circuited in ensureBuild, so this branch only
  // runs when the cache entry is missing or partial. On Windows this is the
  // hot path for ENOTEMPTY races; RM_OPTS gives us 5×100ms of retries which
  // is enough to outlast AV/Search/OneDrive file-handle lag in practice.
  await rm(cacheDir, RM_OPTS);
  await mkdir(cacheDir, { recursive: true });

  await copyTree(TEMPLATE_REACT_DIR, cacheDir, COPY_SKIP);

  const flags: FeatureFlags = {
    // The iframe is a max-capability preview shell. Supabase source stays
    // present so toggling the playground's Supabase flag never rebuilds;
    // the file/code simulator remains the source of truth for whether a
    // real CLI scaffold would include or strip those files.
    supabase: true,
  };
  const variants: VariantSelections = {
    // These values only seed marker-aware helpers. Every playground axis
    // that can change at runtime is kept below via keepAllVariants.
    platform: inputs.platform,
    design: inputs.design,
    layout: inputs.layout,
    ui: inputs.ui,
    toastPosition: inputs.toastPosition,
  };
  // The playground used to strip exactly like the CLI so the files
  // panel matched 1:1. That coupling is gone now: the files panel is
  // served by `simulate-strip.ts` (Phase F), and the *built bundle*
  // running in the iframe is a max-capability runtime shell. Every
  // playground value coexists in the build where that is meaningful, and
  // the template's own dispatchers (CSS class on <html>, React Context,
  // component state) pick one based on a postMessage from the shell.
  //
  //   - `keepAllVariants` includes platform too, so mobile PWA meta,
  //     safe-area utilities, Vite base guards, and every layout sibling
  //     survive in the single preview bundle.
  //
  //   - The `ui` axis is NOT in `keepAllVariants` — it's a scaffold-time
  //     file swap (Phase J), so each `--ui` value produces a distinct
  //     build hash + cache entry. The LRU cache size accommodates all
  //     three.
  //
  //   - `keepShells` preserves both desktop and mobile shell directories
  //     on disk for the cached source tree. The iframe still runs the
  //     Vite web bundle; shell presence is for source inspection only.
  //
  //   - Supabase source is always present in the iframe build. The
  //     generated file tree for `--no-supabase` is shown by
  //     simulate-strip, not by mutating this cache dir.
  //
  // The runtime DEV gate in `app/router.tsx` is the second half of the
  // showcase story: with `mode: 'development'` set on the viteBuild
  // below, `import.meta.env.DEV` evaluates to `true` inside the
  // playground's bundle, so the gated examples routes mount. End users
  // running `npm run build` get a production bundle where the same
  // gate evaluates to `false` and tree-shakes the routes away.
  await stripFeatures(cacheDir, flags, variants, {
    keepAllVariantFiles: true,
    keepShells: true,
    keepAllVariants: ['platform', 'design', 'layout', 'toastPosition'],
  });

  // Phase J: bake the chosen UI library's components into the cache
  // dir. For `--ui custom` this is a no-op; for `--ui shadcn` /
  // `--ui animate-ui` it swaps the project-authored primitives for the
  // pre-baked snapshot copies so the iframe shows the same files the
  // user would scaffold. Each `ui` value gets its own build hash, so
  // the iframe rebuilds cleanly when the user cycles the selector.
  await applyUiSnapshot(cacheDir, inputs.ui, UI_SNAPSHOTS_ROOT);

  await runViteBuild(
    {
      root: cacheDir,
      base: `/preview/${hash}/`,
      configFile: path.join(cacheDir, 'vite.config.ts'),
      // `mode` flips `import.meta.env.DEV` to `true` in the produced
      // bundle, which is the second half of "the playground is the
      // template's dev environment". The first half (source files
      // present) is now handled by the unconditional `examples` ship in
      // the CLI's strip-features.ts — the showcase directory is part of
      // every scaffold. NOTE: mode alone is NOT sufficient when the host
      // has NODE_ENV='production' (Vite OR-s the two flags) — see
      // `runViteBuildSpawn` for the prod story (per-spawn env override)
      // and the module-level NODE_ENV='development' for the dev story
      // (in-process fallback).
      mode: 'development',
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: false,
        // We still want production-grade output (minified, no HMR client)
        // because the iframe loads the static dist via the server's
        // pass-through middleware. Only the env semantics change.
        minify: true,
      },
      logLevel: 'warn',
      clearScreen: false,
    },
    hash
  );

  // Write the integrity marker LAST, after viteBuild has fully
  // resolved. A cache dir without this file is treated as half-built
  // by `isReady` and gets purged on the next eviction pass. We
  // intentionally don't try/catch — if writing this 1-line file fails,
  // the build is genuinely broken and the caller's error path should
  // surface that.
  await writeFile(getBuildOkPath(hash), `${Date.now()}\n`, 'utf8');
}
