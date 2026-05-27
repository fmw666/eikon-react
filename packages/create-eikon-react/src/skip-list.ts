/**
 * @file skip-list.ts
 * @description Single source of truth for files & directories that are
 *  never part of a scaffolded project. Imported by every code path that
 *  copies, hashes, or enumerates the template so they stay aligned.
 *
 *  Why one list:
 *  Previously each of the five touchpoints (CLI copy, sync-template script,
 *  preview-site builder, fingerprint, /api/files middleware) kept its own
 *  literal set. They drifted ( .tsbuildinfo / .git ), causing the playground
 *  to display files the user would never actually receive — which is the
 *  exact opposite of what the preview is for. Centralising it here also
 *  makes the "preview = user's scaffold" invariant testable.
 *
 *  Adding to this list means "no consumer of this template ever sees this
 *  on disk". Build artefacts (dist/), dependency caches (.vite, node_modules),
 *  IDE-local state (.turbo), incremental-build outputs (.tsbuildinfo), and
 *  source-repo bookkeeping (.git, .preview-cache) belong here. Anything a
 *  user might reasonably want to read or edit after `create-eikon-react`
 *  does NOT — including `__tests__/`, `.agent/`, `tsconfig.*`, `vitest.*`.
 */

// =================================================================================================
// Constant
// =================================================================================================

/**
 * Names (basenames, not paths) that all template-copy code paths must skip.
 *
 * Lock-step consumers:
 *   - `packages/create-eikon-react/src/copy-template.ts`         (CLI → user)
 *   - `packages/create-eikon-react/scripts/sync-template.mjs`    (dev → publish)
 *   - `packages/preview-site/server/builder.ts`                  (preview copy)
 *   - `packages/preview-site/server/fingerprint.ts`              (preview hash)
 *   - `packages/preview-site/server/middleware.ts`               (/api/files)
 *
 * `sync-template.mjs` cannot import this file (it runs before tsup compiles
 * anything and Node-native ESM cannot resolve .ts), so it duplicates the
 * literal — `parity.test.ts` asserts the two stay equal.
 */
export const TEMPLATE_COPY_SKIP: ReadonlySet<string> = new Set([
  // npm / pnpm install output — re-installed locally by the user.
  'node_modules',
  // Vite / tsup / tsc build output.
  'dist',
  // Vitest coverage output.
  'coverage',
  // Vite dependency optimiser cache.
  '.vite',
  // Turbo task cache.
  '.turbo',
  // `tsc --build` incremental info — sometimes lands in repo root.
  '.tsbuildinfo',
  // Preview-site's per-variant build cache; lives INSIDE template-react/.
  // Never propagate it out via the CLI or back through the sync script.
  '.preview-cache',
  // The CLI runs `initGit()` to create a fresh repo for the user; copying
  // the source `.git` would import the entire monorepo history.
  '.git',
  // Pre-baked upstream UI library snapshots used by `--ui shadcn` /
  // `--ui animate-ui` at scaffold time. Defensive: the canonical
  // `template-snapshots/` lives as a sibling of `template/` and so
  // never reaches the copy walkers, but if a maintainer ever drops a
  // subdirectory by this name into `template/`, every consumer of this
  // list will skip it.
  'template-snapshots',
]);
