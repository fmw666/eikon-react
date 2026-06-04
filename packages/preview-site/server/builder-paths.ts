import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TEMPLATE_COPY_SKIP } from '../../create-eikon-react/src/skip-list';

import type { BuildInputs } from './hash';

/**
 * Internal to the builder. Path layout, recursive-rm tuning, default build
 * inputs, the copy skip-list, and the cache-dir / readiness helpers — all of
 * the side-effect-free "where do files live and is a build complete" concerns
 * that `builder.ts` re-exports verbatim so its public import path is unchanged.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * packages/preview-site/server → packages/preview-site → packages → <monorepo root>.
 * The cache lives INSIDE template-react so that Node's package resolution
 * automatically walks up to template-react/node_modules when vite runs — no
 * symlink trickery required.
 */
export const TEMPLATE_REACT_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  'template-react'
);
export const CACHE_ROOT = path.join(TEMPLATE_REACT_DIR, '.preview-cache');

/**
 * Sibling-package path: `packages/create-eikon-react/template-snapshots/`.
 * Same relative-hops from both source (`server/`) and bundle
 * (`dist-server/`) — `..` from either lands in `packages/preview-site/`,
 * so `../../create-eikon-react/template-snapshots` is correct in both
 * contexts. Passed to `applyUiSnapshot` so it resolves the snapshot
 * root relative to the create-eikon-react package, not to wherever this
 * preview-site module happens to be bundled.
 */
export const UI_SNAPSHOTS_ROOT = path.resolve(
  __dirname,
  '..',
  '..',
  'create-eikon-react',
  'template-snapshots'
);

/**
 * Recursive-rm options tuned for Windows. NTFS releases file handles
 * asynchronously and antivirus / Windows Search / OneDrive routinely keep
 * freshly-written files locked for tens of milliseconds after a build, which
 * makes naive depth-first `rmdir` race with `ENOTEMPTY` on parent directories
 * (the children's deletions haven't flushed yet). Node's built-in
 * `maxRetries` / `retryDelay` retry exactly the error codes we hit
 * (EBUSY/EMFILE/ENFILE/ENOTEMPTY/EPERM), so we don't need an ad-hoc wrapper.
 */
export const RM_OPTS = {
  recursive: true,
  force: true,
  maxRetries: 5,
  retryDelay: 100,
} as const;

/** Default param values used for pre-warming and for filling in missing keys
 *  on incoming /api/build requests. Kept in lock-step with
 *  packages/preview-site/src/lib/params-schema.ts. */
export const DEFAULT_INPUTS: BuildInputs = {
  platform: 'web',
  supabase: false,
  pm: 'pnpm',
  design: 'default',
  layout: 'stacked',
  ui: 'animate-ui',
  toastPosition: 'top-right',
};

// The skip list is the single CLI-authored source of truth. By reusing it
// we guarantee the playground's file tree mirrors what `create-eikon-react`
// hands the user — minus the same handful of caches and build artefacts.
// In particular: `__tests__/`, `.agent/`, every `*.config.*`, and every
// tsconfig flow through to the cacheDir untouched, which is also what the
// user gets after `pnpm create eikon-react`.
export const COPY_SKIP = TEMPLATE_COPY_SKIP;

export function getCacheDir(hash: string): string {
  return path.join(CACHE_ROOT, hash);
}

export function getDistDir(hash: string): string {
  return path.join(getCacheDir(hash), 'dist');
}

/**
 * Marker filename written at the END of a successful build. Its presence
 * is the integrity check used by `isReady` and by the boot-time scrub —
 * a cache dir without it is assumed corrupt (build was killed mid-write,
 * Fly SIGTERM during deploy, OOM'd before the dist completed) and gets
 * deleted on next eviction.
 */
export const BUILD_OK_MARKER = '.build-ok';

export function getBuildOkPath(hash: string): string {
  return path.join(getDistDir(hash), BUILD_OK_MARKER);
}

/**
 * A hash is `ready` only when BOTH `index.html` and `.build-ok` exist.
 * `index.html` alone is insufficient: Vite writes it relatively early in
 * the bundle pass, so a SIGTERM mid-build can leave a tree with the
 * entry HTML present but downstream JS chunks missing — the iframe then
 * 404s on the first script load.
 */
export function isReady(hash: string): boolean {
  const dist = getDistDir(hash);
  return (
    existsSync(path.join(dist, 'index.html')) &&
    existsSync(path.join(dist, BUILD_OK_MARKER))
  );
}
