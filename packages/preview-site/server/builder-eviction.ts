import { existsSync } from 'node:fs';
import { readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import {
  BUILD_OK_MARKER,
  CACHE_ROOT,
  RM_OPTS,
} from './builder-paths';
import {
  errors,
  inflight,
  lastServed,
  MAX_CACHED_HASHES,
  SERVED_TTL_MS,
} from './builder-state';
import { incr } from './metrics';
import { logError } from './log';

/**
 * Internal to the builder. On-disk cache lifecycle: the boot-time scrub of
 * half-built trees and the LRU eviction pass (plus its pure policy helper).
 * Re-exported from `builder.ts` so its public surface
 * (`scrubHalfBuiltCacheDirs`, `selectHashesToEvict`, `DirStat`) is unchanged.
 */

let evictionInflight: Promise<void> | null = null;

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

/**
 * Schedule an LRU eviction off the request path; serialised so multiple
 * overlapping builds don't trip over each other on the filesystem.
 */
export function scheduleEviction(): void {
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
