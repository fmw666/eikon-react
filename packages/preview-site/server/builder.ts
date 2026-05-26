import { existsSync } from 'node:fs';
import { copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build as viteBuild } from 'vite';

import { TEMPLATE_COPY_SKIP } from '../../create-eikon-react/src/skip-list';
import {
  stripFeatures,
  type FeatureFlags,
  type VariantSelections,
} from '../../create-eikon-react/src/strip-features';

import { getTemplateRev } from './fingerprint';
import { hashBuildInputs, type BuildInputs } from './hash';

// Force the template's viteBuild() to compute import.meta.env.DEV === true.
//
// Vite resolves isProduction = `NODE_ENV === 'production' || mode === 'production'`
// and then sets `import.meta.env.DEV = !isProduction`. Passing `mode: 'development'`
// to viteBuild (see runBuild below) is necessary but NOT sufficient when the
// host process has NODE_ENV='production' — Fly's runtime config sets that, and
// it would silently flip DEV to false in the produced bundle.
//
// That breaks the `examples` showcase: the template's router double-gates
// example routes on `import.meta.env.DEV` (see template-react/src/app/router.tsx
// line 55) so they disappear from production builds. The preview-site exists
// specifically to demonstrate the FULL template (examples included), so we
// need DEV=true regardless of how the host is deployed.
//
// Setting NODE_ENV='development' once at module load (before Vite's first
// resolveConfig) is the canonical fix and matches what `vite build` itself
// does in its CLI entrypoint. The preview-site's React shell is already
// minified at Docker-build time, and nothing in the runtime Node server
// branches on NODE_ENV, so flipping it process-wide is safe here.
process.env.NODE_ENV = 'development';

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
const CACHE_ROOT = path.join(TEMPLATE_REACT_DIR, '.preview-cache');

/**
 * Recursive-rm options tuned for Windows. NTFS releases file handles
 * asynchronously and antivirus / Windows Search / OneDrive routinely keep
 * freshly-written files locked for tens of milliseconds after a build, which
 * makes naive depth-first `rmdir` race with `ENOTEMPTY` on parent directories
 * (the children's deletions haven't flushed yet). Node's built-in
 * `maxRetries` / `retryDelay` retry exactly the error codes we hit
 * (EBUSY/EMFILE/ENFILE/ENOTEMPTY/EPERM), so we don't need an ad-hoc wrapper.
 */
const RM_OPTS = {
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
const COPY_SKIP = TEMPLATE_COPY_SKIP;

export type BuildStatus = 'ready' | 'building' | 'error';

export interface BuildState {
  hash: string;
  status: BuildStatus;
  error?: string;
}

const inflight = new Map<string, Promise<void>>();
const errors = new Map<string, string>();
/**
 * `lastServed[hash]` = wall-clock timestamp of the most recent
 * `/preview/<hash>/...` HTTP hit. Updated by `touchHashServed` from the
 * static-file handler so the LRU eviction can avoid deleting hashes
 * that the iframe is actively displaying.
 *
 * Entries are pruned opportunistically when they age past SERVED_TTL_MS
 * (during eviction), so the map size stays bounded.
 */
const lastServed = new Map<string, number>();

/**
 * Caps on retained build state. The cache lives on disk (every entry is a
 * full template tree + a Vite dist), so an unbounded cache will OOM the
 * dev process after a few hours of editing (each template edit produces a
 * new templateRev → new hash → new dir, and the old dirs were orphaned).
 *
 * Phase G: the build matrix is exactly `platform × supabase` = 6 combos
 * (see `server/hash.ts` for the schema-version 3 hash). 8 gives us the
 * full pre-bake plus 2 slots of headroom for an in-flight templateRev
 * rotation during dev edits. At ~3 MB / dist that's ~24 MB on disk —
 * comfortably under any reasonable budget.
 */
const MAX_CACHED_HASHES = 8;
const MAX_RETAINED_ERRORS = 32;
/**
 * Hashes whose `/preview/<hash>/...` URL was hit within `SERVED_TTL_MS`
 * are protected from LRU eviction even if their cache-dir mtime aged out.
 * Without this, after the user cycles through MAX_CACHED_HASHES variants
 * the iframe's *currently displayed* hash gets deleted under it (the dir
 * mtime doesn't refresh on read), the iframe later 404s on a chunk fetch
 * or a navigation, and the user sees a black screen.
 *
 * Phase G: with only 6 build combos total, eviction pressure is low and
 * the iframe will rarely flip outside the prebaked set, so we don't need
 * to keep a long protective tail. 2 minutes still comfortably covers a
 * user mid-cycle (the iframe doesn't pause that long between switches),
 * but lets stale templateRev dirs age out faster after edits.
 */
const SERVED_TTL_MS = 2 * 60_000;

let evictionInflight: Promise<void> | null = null;

export function getCacheDir(hash: string): string {
  return path.join(CACHE_ROOT, hash);
}

export function getDistDir(hash: string): string {
  return path.join(getCacheDir(hash), 'dist');
}

export function isReady(hash: string): boolean {
  return existsSync(path.join(getDistDir(hash), 'index.html'));
}

export function getError(hash: string): string | undefined {
  return errors.get(hash);
}

/**
 * Look up (or start) the build for `inputs`. Returns immediately with the
 * current state; callers should poll `isReady(hash)` (or hit the matching
 * /api/build-status endpoint) until they see `ready`.
 *
 * Multiple concurrent requests for the same hash share one inflight build.
 */
export async function ensureBuild(inputs: BuildInputs): Promise<BuildState> {
  const templateRev = await getTemplateRev(TEMPLATE_REACT_DIR);
  const hash = hashBuildInputs(inputs, templateRev);

  if (isReady(hash)) return { hash, status: 'ready' };

  // A previous attempt errored; surface the failure instead of silently
  // retrying. Callers can clear errors via clearError(hash) if they want a
  // fresh attempt (e.g. after the user changed something on disk).
  const prevErr = errors.get(hash);
  if (prevErr) return { hash, status: 'error', error: prevErr };

  if (!inflight.has(hash)) {
    const promise = runBuild(hash, inputs)
      .catch((e) => {
        const msg = e instanceof Error ? (e.stack ?? e.message) : String(e);
        errors.set(hash, msg);
        capErrors();
      })
      .finally(() => {
        inflight.delete(hash);
        // Schedule LRU eviction off the request path; serialised so multiple
        // overlapping builds don't trip over each other on the filesystem.
        scheduleEviction();
      });
    inflight.set(hash, promise);
  }

  return { hash, status: 'building' };
}

export function clearError(hash: string): void {
  errors.delete(hash);
}

/**
 * Record a hit on `/preview/<hash>/...`. Called by the static-file
 * handler in `handlers.ts`. The recorded timestamp protects this hash
 * from `evictCacheLru()` for `SERVED_TTL_MS` so the iframe's currently-
 * displayed cache dir is never yanked out from under it during a
 * variant cycling spree.
 */
export function touchHashServed(hash: string): void {
  lastServed.set(hash, Date.now());
}

/**
 * Drop all known build errors. Called from the dev-server file watcher when
 * the template changes, so that fixing a bug in source automatically
 * "unblocks" any variant that previously errored — without the user having
 * to manually refresh or POST /api/clear-cache.
 */
export function clearAllErrors(): void {
  errors.clear();
}

/** Test-only escape hatch; never call from production code paths. */
export async function clearAllCache(): Promise<void> {
  await rm(CACHE_ROOT, RM_OPTS);
  errors.clear();
  inflight.clear();
  lastServed.clear();
}

function capErrors(): void {
  if (errors.size <= MAX_RETAINED_ERRORS) return;
  // Map preserves insertion order, so the oldest entries appear first.
  const drop = errors.size - MAX_RETAINED_ERRORS;
  let i = 0;
  for (const key of errors.keys()) {
    if (i++ >= drop) break;
    errors.delete(key);
  }
}

function scheduleEviction(): void {
  if (evictionInflight) return;
  evictionInflight = evictCacheLru().finally(() => {
    evictionInflight = null;
  });
}

export interface DirStat {
  readonly name: string;
  readonly mtime: number;
}

/**
 * Pure: decide which cache directories to evict given the current set on
 * disk. Kept side-effect-free so the LRU policy can be unit-tested in
 * isolation from the filesystem.
 *
 * Returns the names of directories that should be removed, sorted oldest
 * first. Anything in `keep` is preserved even if it would otherwise be
 * evicted by age (used to protect inflight builds from having their tree
 * yanked out from under Vite).
 */
export function selectHashesToEvict(
  dirs: ReadonlyArray<DirStat>,
  max: number,
  keep: ReadonlySet<string>
): string[] {
  if (dirs.length <= max) return [];
  // Sort newest-first; everything beyond the first `max` is a candidate.
  const sorted = [...dirs].sort((a, b) => b.mtime - a.mtime);
  const candidates = sorted.slice(max);
  return candidates.filter((d) => !keep.has(d.name)).map((d) => d.name);
}

/**
 * Keep at most `MAX_CACHED_HASHES` per-variant cache directories on disk,
 * dropping the oldest by mtime. We never delete a directory whose hash is
 * still being built (inflight) to avoid yanking files out from under Vite,
 * NOR a directory that was hit via `/preview/<hash>/...` within
 * `SERVED_TTL_MS` (so the iframe's currently-displayed variant survives).
 */
async function evictCacheLru(): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(CACHE_ROOT);
  } catch {
    return;
  }
  const stats = await Promise.all(
    entries.map(async (name) => {
      try {
        const st = await stat(path.join(CACHE_ROOT, name));
        return st.isDirectory() ? { name, mtime: st.mtimeMs } : null;
      } catch {
        return null;
      }
    })
  );
  const dirs = stats.filter((d): d is DirStat => d !== null);
  // Prune lastServed entries past their TTL so the map doesn't grow
  // unboundedly (and so a long-idle hash isn't artificially protected).
  const now = Date.now();
  for (const [h, ts] of lastServed) {
    if (now - ts > SERVED_TTL_MS) lastServed.delete(h);
  }
  const keep = new Set<string>([...inflight.keys(), ...lastServed.keys()]);
  const toRemove = selectHashesToEvict(dirs, MAX_CACHED_HASHES, keep);

  await Promise.all(
    toRemove.map(async (name) => {
      try {
        await rm(path.join(CACHE_ROOT, name), RM_OPTS);
        errors.delete(name);
        lastServed.delete(name);
      } catch {
        // Best-effort: even with RM_OPTS retries, a directory might still be
        // held open by Vite/AV on Windows past our retry budget. We'll pick
        // it up on the next eviction pass.
      }
    })
  );
}

/**
 * Test-only escape hatch for the error map. The error cap is enforced by
 * a non-exported `capErrors()`; this lets tests prime the map and assert
 * the cap is honoured without going through the build flow.
 *
 * @internal — do NOT import from production code paths.
 */
export const __testHooks = {
  capErrors,
  setError(hash: string, msg: string): void {
    errors.set(hash, msg);
  },
  countErrors(): number {
    return errors.size;
  },
  clearErrors(): void {
    errors.clear();
  },
  MAX_RETAINED_ERRORS,
  MAX_CACHED_HASHES,
};

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
    supabase: inputs.supabase,
    i18n: true,
  };
  const variants: VariantSelections = {
    platform: inputs.platform,
    design: inputs.design,
    layout: inputs.layout,
    ui: inputs.ui,
    toastPosition: inputs.toastPosition,
  };
  // The playground used to strip exactly like the CLI so the files
  // panel matched 1:1. That coupling is gone now: the files panel is
  // served by `simulate-strip.ts` (Phase F), and the *built bundle*
  // running in the iframe is a runtime-switchable shell — every value
  // of design / ui / layout / toastPosition coexists in the build, and
  // the template's own dispatchers (CSS class on <html>, React Context,
  // component state) pick one based on a postMessage from the shell.
  //
  //   - `keepAllVariants` lists the four runtime-switchable axes so
  //     their `@eikon:variant` blocks AND file-level markers stay put.
  //     Block-level platform/supabase markers still strip — those gate
  //     things (apple-mobile-web-app-capable meta, --touch-target-min
  //     token, supabase imports) that aren't safe to coexist.
  //
  //   - `keepAllVariantFiles` and `keepShells` stay on for backward
  //     compat with the file-tree expectations the playground had
  //     pre-Phase-F; they're cheap and Phase F's simulate-strip is
  //     authoritative for the panel anyway.
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
    keepAllVariants: ['design', 'ui', 'layout', 'toastPosition'],
  });

  await viteBuild({
    root: cacheDir,
    base: `/preview/${hash}/`,
    configFile: path.join(cacheDir, 'vite.config.ts'),
    // `mode` flips `import.meta.env.DEV` to `true` in the produced
    // bundle, which is the second half of "the playground is the
    // template's dev environment". The first half (source files
    // present) is now handled by the unconditional `examples` ship in
    // the CLI's strip-features.ts — the showcase directory is part of
    // every scaffold. NOTE: mode alone is NOT sufficient when the host
    // has NODE_ENV='production' (Vite OR-s the two flags) — see the
    // module-level NODE_ENV override at the top of this file for the
    // load-bearing other half.
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
  });
}

/**
 * Manual recursive copy that skips entries whose basename is in `skip`.
 *
 * Node's `fs.cp({recursive: true})` refuses when dest is a subdirectory of
 * src — which is exactly our setup (cache lives under template-react/). The
 * hand-rolled version sidesteps that check entirely because each
 * `copyFile`/`mkdir` call sees only individual paths, not the relationship.
 */
async function copyTree(
  src: string,
  dest: string,
  skip: ReadonlySet<string>
): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (skip.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyTree(from, to, skip);
    } else if (entry.isFile()) {
      await copyFile(from, to);
    }
    // Symlinks and other special files are uncommon in template payloads;
    // silently skip them rather than try to faithfully reproduce.
  }
}
