import { rm } from 'node:fs/promises';

import { CACHE_ROOT, RM_OPTS } from './builder-paths';

/**
 * Internal to the builder. Owns the three module-level Maps that track build
 * state across requests (inflight builds, recorded errors, last-served
 * timestamps) plus the retention tunables and the small error-map helpers.
 * Centralising the mutable state here lets `builder-eviction.ts`,
 * `builder.ts`, and the test hooks share one source of truth without a
 * dependency cycle.
 */

export const inflight = new Map<string, Promise<void>>();

/**
 * Error map. Each entry carries a timestamp so we can age out stale errors
 * (P4.7): a transient build failure should not block a retry forever.
 * `prevErr` checks in `ensureBuild` ignore entries older than `ERROR_TTL_MS`.
 */
export interface ErrorEntry {
  readonly message: string;
  readonly at: number;
}
export const errors = new Map<string, ErrorEntry>();

/**
 * `lastServed[hash]` = wall-clock timestamp of the most recent
 * `/preview/<hash>/...` HTTP hit. Updated by `touchHashServed` from the
 * static-file handler so the LRU eviction can avoid deleting hashes
 * that the iframe is actively displaying.
 *
 * Entries are pruned opportunistically when they age past SERVED_TTL_MS
 * (during eviction), so the map size stays bounded.
 */
export const lastServed = new Map<string, number>();

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
export const MAX_CACHED_HASHES = 6;
export const MAX_RETAINED_ERRORS = 32;
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
export const SERVED_TTL_MS = 2 * 60_000;
/**
 * P4.7: Errors older than this are ignored by `ensureBuild`'s prevErr
 * check, allowing a transient failure (network blip, OOM during a spike)
 * to retry on its own. 5 minutes is long enough that a genuinely broken
 * template doesn't loop endlessly during a deploy, and short enough that
 * a fixed-on-disk template doesn't require a manual /api/clear-cache.
 */
export const ERROR_TTL_MS = 5 * 60_000;

export function getError(hash: string): string | undefined {
  const entry = errors.get(hash);
  return entry?.message;
}

export function clearError(hash: string): void {
  errors.delete(hash);
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
 * Record a hit on `/preview/<hash>/...`. Called by the static-file
 * handler in `handlers.ts`. The recorded timestamp protects this hash
 * from `evictCacheLru()` for `SERVED_TTL_MS` so the iframe's currently-
 * displayed cache dir is never yanked out from under it during a
 * variant cycling spree.
 */
export function touchHashServed(hash: string): void {
  lastServed.set(hash, Date.now());
}

export function capErrors(): void {
  if (errors.size <= MAX_RETAINED_ERRORS) return;
  // Map preserves insertion order, so the oldest entries appear first.
  const drop = errors.size - MAX_RETAINED_ERRORS;
  let i = 0;
  for (const key of errors.keys()) {
    if (i++ >= drop) break;
    errors.delete(key);
  }
}
