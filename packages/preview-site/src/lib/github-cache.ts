/**
 * @file github-cache.ts
 * @description Three-tier cache plumbing for the GitHub changelog client.
 *
 * Internal to `github.ts` — the two `invalidate*` helpers are re-exported
 * from there so the public `@/lib/github` surface is unchanged.
 *
 * CACHE STRATEGY
 *
 *   We layer three tiers, in this order on every read:
 *
 *     1.  Memory map (`MEMO`) — process-lifetime, instant.
 *     2.  localStorage         — survives reloads, JSON-serialised under
 *                                a single namespaced key so a future
 *                                schema bump can bulk-invalidate.
 *     3.  Network              — handled by the caller; this module only
 *                                owns the first two tiers + the stale
 *                                read used by the stale-while-error path.
 *
 *   Storage failures (private mode, quota exceeded) are swallowed; the
 *   memory layer is always available so a single visit still benefits
 *   from cache hits even when localStorage is unusable.
 */

interface CacheEntry<T> {
  data: T;
  /** Epoch-ms at which this entry was written. */
  ts: number;
}

interface CacheBlob {
  /** Schema version; bump to force-invalidate on shape changes. */
  v: 1;
  entries: Record<string, CacheEntry<unknown>>;
}

const STORAGE_KEY = 'eikon.changelog.cache.v1';

/** Per-endpoint TTL in milliseconds. See `github.ts` header for rationale. */
export const TTL = {
  releases: 60 * 60 * 1000, // 60 min — anonymous quota is 60 req/hr/IP
  compare: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

const MEMO = new Map<string, CacheEntry<unknown>>();

function readBlob(): CacheBlob {
  if (typeof window === 'undefined') return { v: 1, entries: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { v: 1, entries: {} };
    const parsed = JSON.parse(raw) as Partial<CacheBlob>;
    if (!parsed || parsed.v !== 1 || typeof parsed.entries !== 'object') {
      return { v: 1, entries: {} };
    }
    return parsed as CacheBlob;
  } catch {
    return { v: 1, entries: {} };
  }
}

function writeBlob(blob: CacheBlob): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
  } catch {
    // Quota / private-mode failures are non-fatal — memory cache still
    // makes the same-tab session feel responsive.
  }
}

export function cacheGet<T>(key: string, ttl: number): T | null {
  const now = Date.now();
  const fromMemo = MEMO.get(key);
  if (fromMemo && now - fromMemo.ts < ttl) return fromMemo.data as T;

  const blob = readBlob();
  const stored = blob.entries[key];
  if (!stored || now - stored.ts >= ttl) return null;
  // Promote to memory so subsequent reads in the same session are hot.
  MEMO.set(key, stored);
  return stored.data as T;
}

/**
 * Read cache IGNORING the TTL — used by the stale-while-error fallback.
 * Returns whatever's there even if it's expired. Callers should only
 * reach for this AFTER a network attempt has failed (e.g. rate limit,
 * offline) — surfacing arbitrarily-old data is a deliberate degradation,
 * not a happy-path read.
 */
export function cacheGetStale<T>(key: string): T | null {
  const fromMemo = MEMO.get(key);
  if (fromMemo) return fromMemo.data as T;

  const blob = readBlob();
  const stored = blob.entries[key];
  if (!stored) return null;
  // Promote so subsequent reads in this session don't re-parse the blob.
  MEMO.set(key, stored);
  return stored.data as T;
}

export function cacheSet<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { data, ts: Date.now() };
  MEMO.set(key, entry);
  const blob = readBlob();
  blob.entries[key] = entry;
  writeBlob(blob);
}

/**
 * Force-purge a single cache key. Exposed so the UI's "refresh" affordance
 * can re-fetch even within the TTL window.
 */
export function invalidateCacheKey(key: string): void {
  MEMO.delete(key);
  const blob = readBlob();
  if (blob.entries[key]) {
    delete blob.entries[key];
    writeBlob(blob);
  }
}

/** Bulk-purge all cached changelog data. Used by the "refresh" button. */
export function invalidateAllChangelogCache(): void {
  MEMO.clear();
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
