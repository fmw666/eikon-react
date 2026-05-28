import { existsSync } from 'node:fs';
import { copyFile, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcess } from 'node:child_process';

import { build as viteBuild } from 'vite';

import { TEMPLATE_COPY_SKIP } from '../../create-eikon-react/src/skip-list';
import { applyUiSnapshot } from '../../create-eikon-react/src/apply-ui-snapshot';
import {
  stripFeatures,
  type FeatureFlags,
  type VariantSelections,
} from '../../create-eikon-react/src/strip-features';

import { getTemplateRev } from './fingerprint';
import { hashBuildInputs, type BuildInputs } from './hash';
import { logError, logEvent } from './log';
import { incr, observe } from './metrics';

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
const COPY_SKIP = TEMPLATE_COPY_SKIP;

export type BuildStatus = 'ready' | 'building' | 'error';

export interface BuildState {
  hash: string;
  status: BuildStatus;
  error?: string;
}

const inflight = new Map<string, Promise<void>>();
/**
 * Error map. Each entry carries a timestamp so we can age out stale errors
 * (P4.7): a transient build failure should not block a retry forever.
 * `prevErr` checks in `ensureBuild` ignore entries older than `ERROR_TTL_MS`.
 */
interface ErrorEntry {
  readonly message: string;
  readonly at: number;
}
const errors = new Map<string, ErrorEntry>();
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
 * Phase 4 (P4.3): bumped 3 → 6 because `ui` is now in the hash and three
 * `ui` values × at most one in-flight rebuild on a template edit was
 * forcing eviction of an in-use hash. 6 = 3 ui × 2 buffer for in-flight
 * rebuilds. Disk cost: ~6 × ~50 MB tree = ~300 MB on the Fly volume.
 */
const MAX_CACHED_HASHES = 6;
const MAX_RETAINED_ERRORS = 32;
/**
 * Hashes whose `/preview/<hash>/...` URL was hit within `SERVED_TTL_MS`
 * are protected from LRU eviction even if their cache-dir mtime aged out.
 * Without this, after the user cycles through MAX_CACHED_HASHES variants
 * the iframe's *currently displayed* hash gets deleted under it (the dir
 * mtime doesn't refresh on read), the iframe later 404s on a chunk fetch
 * or a navigation, and the user sees a black screen.
 *
 * Phase H: params no longer create new hashes, so this mostly protects
 * the currently displayed template revision during local edits.
 */
const SERVED_TTL_MS = 2 * 60_000;
/**
 * P4.7: Errors older than this are ignored by `ensureBuild`'s prevErr
 * check, allowing a transient failure (network blip, OOM during a spike)
 * to retry on its own. 5 minutes is long enough that a genuinely broken
 * template doesn't loop endlessly during a deploy, and short enough that
 * a fixed-on-disk template doesn't require a manual /api/clear-cache.
 */
const ERROR_TTL_MS = 5 * 60_000;
/**
 * P4.5: Hard ceiling on a single viteBuild. The 1 GB Fly machine has been
 * observed to wedge for >10 min when the bundler enters a pathological
 * import graph; reject after this window so callers see an error instead
 * of hanging forever. Note: Vite has no AbortSignal, so the orphaned
 * build may continue consuming RAM in the background — the cache scrub
 * + LRU eviction cleans up the half-built dir on the next pass.
 */
const BUILD_TIMEOUT_MS = 60_000;
/**
 * P4.6: At most this many distinct viteBuild calls run at once. Each
 * peaks around 600 MB resident; two parallel = ~1.2 GB which already
 * brushes the 1 GB Fly cap, so the third caller waits in the queue
 * (still reported as `building` to the client). Same-hash callers
 * always share one inflight build via the `inflight` map, so this cap
 * only kicks in when a user cycles `ui` or templateRev pumps a new
 * hash while another build is still running.
 */
const BUILD_CONCURRENCY = 2;

let evictionInflight: Promise<void> | null = null;
/**
 * Counting-semaphore state for P4.6. `buildSlotsInUse` tracks active
 * runBuild calls; `buildWaiters` is a FIFO of resolvers awaiting a slot.
 */
let buildSlotsInUse = 0;
const buildWaiters: Array<() => void> = [];

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
const BUILD_OK_MARKER = '.build-ok';

function getBuildOkPath(hash: string): string {
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

export function getError(hash: string): string | undefined {
  const entry = errors.get(hash);
  return entry?.message;
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

  if (isReady(hash)) {
    incr('cache_hit');
    return { hash, status: 'ready' };
  }

  // A previous attempt errored; surface the failure instead of silently
  // retrying — UNLESS the error has aged past ERROR_TTL_MS, in which
  // case we let a fresh attempt run (P4.7). Callers can also clear
  // errors via clearError(hash) for an immediate retry.
  const prevErr = errors.get(hash);
  if (prevErr) {
    if (Date.now() - prevErr.at < ERROR_TTL_MS) {
      incr('cache_error_replay');
      return { hash, status: 'error', error: prevErr.message };
    }
    errors.delete(hash);
  }

  if (!inflight.has(hash)) {
    incr('cache_miss');
    const startedAt = Date.now();
    logEvent('build_started', { hash });
    const promise = runBuildGated(hash, inputs)
      .then(() => {
        const duration_ms = Date.now() - startedAt;
        incr('build_completed');
        observe('build_duration_ms', duration_ms);
        logEvent('build_completed', { hash, duration_ms });
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? (e.stack ?? e.message) : String(e);
        errors.set(hash, { message: msg, at: Date.now() });
        capErrors();
        const duration_ms = Date.now() - startedAt;
        // Distinguish a timeout-kill from a genuine failure for at-a-glance
        // grep-ability. The `kill` signal is included by `runViteBuildSpawn`'s
        // rejection message; a tighter contract would be a typed error.
        const isTimeout = msg.includes('timed out') || msg.includes('killed');
        incr(isTimeout ? 'build_timeout' : 'build_failed');
        logEvent('build_failed', {
          hash,
          duration_ms,
          timeout: isTimeout,
          error_message: e instanceof Error ? e.message : String(e),
        });
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

/**
 * Walk the on-disk cache root once at startup and delete any cache dir
 * whose `dist/` is missing the `.build-ok` integrity marker. These
 * "half-built" trees can show up after a SIGKILL / OOM / Fly SIGTERM
 * mid-build — the directory survives the kill, but `index.html` may be
 * present without its dependent chunks, which would 404 the iframe.
 *
 * Idempotent: subsequent calls find nothing to do. Safe to call from
 * `prod.ts` boot before the listener starts. Returns the names of dirs
 * it removed (for logging).
 *
 * Errors during enumeration / removal are swallowed and logged via
 * console.warn — boot must NOT fail because a stale dir is locked. The
 * next eviction pass picks up whatever this one missed.
 */
export async function scrubHalfBuiltCacheDirs(): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(CACHE_ROOT);
  } catch {
    return []; // CACHE_ROOT doesn't exist yet — nothing to scrub.
  }
  const removed: string[] = [];
  await Promise.all(
    entries.map(async (name) => {
      const dir = path.join(CACHE_ROOT, name);
      try {
        const st = await stat(dir);
        if (!st.isDirectory()) return;
        const hasMarker = existsSync(
          path.join(dir, 'dist', BUILD_OK_MARKER)
        );
        const hasIndex = existsSync(path.join(dir, 'dist', 'index.html'));
        // No marker AND no index → never built, but the dir is here for
        // some reason (an aborted very-early build). Leave it; it'll
        // either get re-used or aged out by LRU.
        // No marker but HAS index → half-built, the dangerous case.
        if (!hasMarker && hasIndex) {
          await rm(dir, RM_OPTS);
          removed.push(name);
        }
      } catch (err) {
        logError('builder_scrub_inspect_failed', err, { dir: name });
      }
    })
  );
  return removed;
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
  evictionInflight = evictCacheLru()
    .catch((e) => {
      // P4.26: previously this catch was implicit via .finally swallowing
      // the rejection. A failing eviction (rare, but possible if Windows
      // antivirus permanently locks a tree) was completely silent — the
      // disk would just keep growing. Surface it as a structured event so
      // it shows up in Fly's logs and a maintainer can investigate.
      // Eviction is best-effort; we never want a failure here to crash
      // the server.
      logError('builder_eviction_failed', e);
    })
    .finally(() => {
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
      // P4.4: re-check inflight at the moment of removal. The selection
      // above happens once per scheduleEviction tick; a new build can
      // start AFTER `keep` was computed but BEFORE `rm` runs. Without
      // this re-check, eviction would race the new build's `mkdir` and
      // delete its half-written tree mid-build. (`evictionInflight`
      // serialises eviction passes, but doesn't synchronise with build
      // start — so the read-then-rm is the actual race window.)
      if (inflight.has(name)) return;
      // Audit Lane B close-out: also re-check `lastServed`. A
      // /preview/<hash>/* request landing between `keep` selection
      // (above) and `rm` (below) calls `touchHashServed(name)` and
      // marks the dir as currently displayed. Without this guard,
      // eviction would still delete it and the iframe would 404 on
      // its next chunk fetch. Window is sub-millisecond but observable
      // under sustained navigation.
      if (lastServed.has(name)) return;
      try {
        await rm(path.join(CACHE_ROOT, name), RM_OPTS);
        errors.delete(name);
        lastServed.delete(name);
        incr('cache_eviction');
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
    errors.set(hash, { message: msg, at: Date.now() });
  },
  countErrors(): number {
    return errors.size;
  },
  clearErrors(): void {
    errors.clear();
  },
  MAX_RETAINED_ERRORS,
  MAX_CACHED_HASHES,
  ERROR_TTL_MS,
  BUILD_TIMEOUT_MS,
  BUILD_CONCURRENCY,
};

/**
 * P4.5 + P4.6: queue-and-cap wrapper around `runBuild`. Acquires one
 * of `BUILD_CONCURRENCY` slots before starting the actual build, and
 * imposes a `BUILD_TIMEOUT_MS` ceiling on the inner work.
 *
 * The slot is released in a `finally` so a thrown error (timeout, vite
 * crash, fs failure) can't leak the slot. The semaphore is FIFO via the
 * `buildWaiters` queue.
 */
async function runBuildGated(hash: string, inputs: BuildInputs): Promise<void> {
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

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(
          `build timed out after ${(ms / 1000).toFixed(0)}s (hash=${label}). ` +
            `Vite has no AbortSignal so the orphaned build may continue ` +
            `running in the background until it completes or the process exits.`
        )
      );
    }, ms);
    // Don't keep the event loop alive solely for the timeout.
    timer.unref?.();
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Path to the bundled `build-worker.js` next to `prod.js`. Resolved at
 * module load: in the prod image this resolves to `dist-server/build-worker.js`,
 * in dev (running TS source through Vite's loader) the file does not exist
 * and `runViteBuild` falls back to an in-process call. Auto-detection
 * keeps the dev story the same (no separate `tsup --watch` dance) while
 * letting prod inherit kill-on-timeout semantics for free.
 */
const BUILD_WORKER_PATH = path.resolve(__dirname, 'build-worker.js');
const USE_BUILD_WORKER = existsSync(BUILD_WORKER_PATH);
/**
 * Grace window between SIGTERM and SIGKILL. SIGTERM gives Vite a chance
 * to flush partial state; if the process is wedged on CPU, SIGKILL goes
 * out 2 s later. The choice of 2 s is conservative — viteBuild's only
 * meaningful response to SIGTERM is "exit fast", so a healthy build
 * exits well within this window.
 */
const BUILD_KILL_GRACE_MS = 2_000;

/**
 * Run a single viteBuild with a hard timeout. In production (when the
 * bundled `build-worker.js` exists next to this module) the call is
 * delegated to a child process so the timeout can SIGKILL a wedged
 * build — releasing its memory immediately, instead of leaving an
 * orphan running until it completes or the parent exits. In dev the
 * call stays in-process; the killability win is a prod concern and the
 * dev story should not require a separate tsup watcher.
 */
async function runViteBuild(
  options: Parameters<typeof viteBuild>[0],
  hash: string
): Promise<void> {
  if (!USE_BUILD_WORKER) {
    await withTimeout(
      viteBuild(options).then(() => undefined),
      BUILD_TIMEOUT_MS,
      hash
    );
    return;
  }
  await runViteBuildSpawn(options, hash);
}

/**
 * Spawn `build-worker.js` to run viteBuild in a child process; SIGTERM
 * (then SIGKILL after `BUILD_KILL_GRACE_MS`) on timeout. The worker's
 * stdout/stderr is forwarded to the parent so build errors land in
 * `fly logs` next to the "[builder]" lines that already provide hash
 * context.
 *
 * `env: { ...process.env, NODE_ENV: 'development' }` is the load-bearing
 * detail: the parent runs with `NODE_ENV=production` (Fly config), but
 * the worker MUST see `development` so Vite's `import.meta.env.DEV`
 * evaluates to true in the produced bundle (see the module-level
 * comment on the older in-process global mutation). Passing the env
 * here scopes the override to just this child — no global pollution.
 */
async function runViteBuildSpawn(
  options: Parameters<typeof viteBuild>[0],
  hash: string
): Promise<void> {
  const json = JSON.stringify(options);
  const child: ChildProcess = spawn(
    process.execPath,
    [BUILD_WORKER_PATH, json],
    {
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env, NODE_ENV: 'development' },
    }
  );
  let killed = false;
  const timer = setTimeout(() => {
    killed = true;
    child.kill('SIGTERM');
    setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
      }
    }, BUILD_KILL_GRACE_MS).unref?.();
  }, BUILD_TIMEOUT_MS);
  timer.unref?.();
  try {
    await new Promise<void>((resolve, reject) => {
      child.once('exit', (code, signal) => {
        if (killed || signal === 'SIGTERM' || signal === 'SIGKILL') {
          reject(
            new Error(
              `build worker killed after ${(BUILD_TIMEOUT_MS / 1000).toFixed(
                0
              )}s timeout (hash=${hash}, signal=${signal ?? 'SIGTERM'})`
            )
          );
          return;
        }
        if (code === 0) {
          resolve();
          return;
        }
        reject(
          new Error(
            `build worker exited with code ${code ?? 'null'} (hash=${hash}). ` +
              `See preceding stderr lines for the viteBuild rejection.`
          )
        );
      });
      child.once('error', (err) => reject(err));
    });
  } finally {
    clearTimeout(timer);
  }
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
