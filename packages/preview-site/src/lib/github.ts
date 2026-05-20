/**
 * @file github.ts
 * @description Tiny GitHub REST client tailored for the Changelog page.
 *
 * Two endpoints, three caches, zero deps.
 *
 * ENDPOINTS
 *
 *   - listReleases()   — `/repos/:owner/:repo/releases` returns the
 *                        published release list (tag, name, body,
 *                        published_at, html_url).
 *   - compareRefs()    — `/repos/:owner/:repo/compare/:base...:head`
 *                        returns BOTH a summary (ahead_by / behind_by /
 *                        total_commits) AND a per-file diff array where
 *                        every file already carries its `patch` (unified
 *                        diff hunks). One round-trip is enough to render
 *                        the entire changed-files tree + per-file diff
 *                        — we do NOT call the contents API per file.
 *
 * CACHE STRATEGY
 *
 *   We layer three tiers, in this order on every read:
 *
 *     1.  Memory map (`MEMO`) — process-lifetime, instant.
 *     2.  localStorage         — survives reloads, JSON-serialised under
 *                                a single namespaced key so a future
 *                                schema bump can bulk-invalidate.
 *     3.  Network              — fetch + write back through both layers.
 *
 *   TTLs differ by endpoint because their immutability differs:
 *
 *     - releases list:  5 minutes — releases CAN be added / re-tagged,
 *                       so we keep this fresh-ish.
 *     - compare(A,B):   7 days   — both endpoints of a tag→tag compare
 *                       are immutable refs; the diff between them is
 *                       cacheable for as long as we like. We cap at a
 *                       week mostly to bound storage growth.
 *
 *   Storage failures (private mode, quota exceeded) are swallowed; the
 *   memory layer is always available so a single visit still benefits
 *   from cache hits even when localStorage is unusable.
 *
 *   We do NOT use ETags / If-None-Match — the simpler TTL model is
 *   plenty for a public marketing-side changelog and avoids a class
 *   of "stale despite 304" bugs. If GitHub rate-limits us, we surface
 *   the message verbatim so visitors understand why the data is empty.
 *
 * NETWORK
 *
 *   We send `Accept: application/vnd.github+json` (the documented
 *   modern content-type) and an `X-GitHub-Api-Version` pin so any
 *   future breaking version bump on GitHub's side doesn't silently
 *   change our payload shape. No auth header — anonymous calls
 *   (60/hr per IP) are sufficient for cached read-mostly traffic on
 *   a single repo. A future iteration can add a server-side proxy
 *   if/when this becomes a bottleneck.
 */

import { isGithubConfigured, SITE } from '@/landing/site-config';

// ---------------------------------------------------------------------------
// Public types — narrow on purpose. We only surface the fields the UI
// actually consumes so adding/removing a column in the future is a
// localized diff instead of touching every consumer.
// ---------------------------------------------------------------------------

export interface GitHubRelease {
  /** Stable identifier — the immutable tag this release was cut from. */
  tagName: string;
  /** Human-friendly title; falls back to `tagName` when omitted. */
  name: string;
  /** ISO-8601 timestamp; used for the relative-date subtitle. */
  publishedAt: string;
  /** Release notes (markdown). May be empty. */
  body: string;
  /** Public link back to the release page on github.com. */
  htmlUrl: string;
  /** Whether GitHub flagged this as a pre-release. Surfaced as a badge. */
  prerelease: boolean;
  /** Whether GitHub flagged this as a draft. We filter these out by default. */
  draft: boolean;
}

export type FileChangeStatus =
  | 'added'
  | 'removed'
  | 'modified'
  | 'renamed'
  | 'copied'
  | 'changed'
  | 'unchanged';

export interface CompareFile {
  /** Path inside the repo at the head ref (or base ref for `removed`). */
  filename: string;
  /** Previous filename when `status === 'renamed'`, else undefined. */
  previousFilename?: string;
  status: FileChangeStatus;
  additions: number;
  deletions: number;
  changes: number;
  /**
   * Unified-diff text. May be undefined for binary files or for files
   * whose patch was truncated by GitHub's 1MB-per-file cap; the UI
   * gracefully degrades to "no preview available" in that case.
   */
  patch?: string;
}

export interface CompareResult {
  base: string;
  head: string;
  /** GitHub's coarse comparison status: ahead | behind | identical | diverged. */
  status: string;
  aheadBy: number;
  behindBy: number;
  totalCommits: number;
  files: CompareFile[];
  htmlUrl: string;
}

// ---------------------------------------------------------------------------
// Cache plumbing
// ---------------------------------------------------------------------------

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

/** Per-endpoint TTL in milliseconds. See file header for rationale. */
const TTL = {
  releases: 5 * 60 * 1000, // 5 min
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

function cacheGet<T>(key: string, ttl: number): T | null {
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

function cacheSet<T>(key: string, data: T): void {
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

// ---------------------------------------------------------------------------
// HTTP plumbing
// ---------------------------------------------------------------------------

const REQUEST_HEADERS: HeadersInit = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

/**
 * Thin fetch wrapper that surfaces a consistent error model:
 *
 *   - HTTP 200-299: returns parsed JSON.
 *   - HTTP 403 with rate-limit headers: throws a typed
 *     `RateLimitError` so the UI can render a tailored message.
 *   - HTTP 404: throws with `notFound: true` so the picker can
 *     gracefully fall back when a tag was deleted upstream.
 *   - Anything else: throws a generic Error with the response body
 *     attached as message.
 */
async function ghFetch<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    headers: REQUEST_HEADERS,
    signal,
  });
  if (res.status === 200) return (await res.json()) as T;
  if (res.status === 403) {
    const rem = res.headers.get('X-RateLimit-Remaining');
    if (rem === '0') {
      const reset = res.headers.get('X-RateLimit-Reset');
      throw new RateLimitError(
        reset ? new Date(Number(reset) * 1000) : null
      );
    }
  }
  if (res.status === 404) {
    throw new NotFoundError(url);
  }
  let body = '';
  try {
    body = await res.text();
  } catch {
    // ignore — we'll just include the status code below
  }
  throw new Error(`GitHub ${res.status}: ${body || res.statusText}`);
}

export class RateLimitError extends Error {
  resetAt: Date | null;
  constructor(resetAt: Date | null) {
    super('GitHub rate limit reached. Try again later.');
    this.name = 'RateLimitError';
    this.resetAt = resetAt;
  }
}

/**
 * Thrown when GitHub returns 404. The two common reasons we hit this:
 *
 *   - The configured repo (`SITE.github.owner/repo`) doesn't exist or
 *     is private — the very first `listReleases()` call returns 404
 *     for the whole repo path. The Changelog UI catches this case and
 *     renders the empty-state CTA pointing the user back to GitHub
 *     instead of a scary red error panel.
 *   - One of the refs the user picked has been deleted upstream
 *     between cache write and read. We surface this on the compare
 *     pane only — the picker still works against the rest of the
 *     release list.
 */
export class NotFoundError extends Error {
  url: string;
  constructor(url: string) {
    super(`Not found: ${url}`);
    this.name = 'NotFoundError';
    this.url = url;
  }
}

// ---------------------------------------------------------------------------
// Endpoint: releases
// ---------------------------------------------------------------------------

interface RawRelease {
  tag_name: string;
  name: string | null;
  published_at: string | null;
  body: string | null;
  html_url: string;
  prerelease: boolean;
  draft: boolean;
}

/**
 * List the most recent published releases for the configured repo. The
 * server returns at most `per_page=100` in one page; for the changelog
 * surface that's plenty (no project the size of this scaffold needs
 * pagination here). If you ever do need more, swap to pagination via
 * `Link` header parsing.
 *
 * Drafts are stripped because they're not meaningful to the public
 * changelog page.
 */
export async function listReleases(
  signal?: AbortSignal
): Promise<GitHubRelease[]> {
  // Bail before issuing any network call if the site hasn't pointed
  // at a real repo yet. The Changelog UI treats a thrown
  // NotFoundError identically to a real 404, so the visitor sees the
  // same friendly empty state and we never light up devtools' network
  // panel with a guaranteed-to-fail request.
  if (!isGithubConfigured()) {
    throw new NotFoundError('github-not-configured');
  }

  const key = `releases:${SITE.github.owner}/${SITE.github.repo}`;
  const cached = cacheGet<GitHubRelease[]>(key, TTL.releases);
  if (cached) return cached;

  const url = `https://api.github.com/repos/${SITE.github.owner}/${SITE.github.repo}/releases?per_page=100`;
  const raw = await ghFetch<RawRelease[]>(url, signal);
  const data: GitHubRelease[] = raw
    .filter((r) => !r.draft)
    .map((r) => ({
      tagName: r.tag_name,
      name: r.name?.trim() || r.tag_name,
      publishedAt: r.published_at ?? '',
      body: r.body ?? '',
      htmlUrl: r.html_url,
      prerelease: r.prerelease,
      draft: r.draft,
    }));
  cacheSet(key, data);
  return data;
}

// ---------------------------------------------------------------------------
// Endpoint: compare
// ---------------------------------------------------------------------------

interface RawCompare {
  status: string;
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  html_url: string;
  files?: Array<{
    filename: string;
    previous_filename?: string;
    status: FileChangeStatus;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
}

/**
 * Compare two refs (tag, branch, or commit SHA). Returns the per-file
 * diff payload directly usable by `DiffView`. The `files` array is
 * sorted alphabetically by filename to give the changed-files tree a
 * stable visual order across renders (GitHub's API order is roughly
 * alphabetical but not guaranteed).
 */
export async function compareRefs(
  base: string,
  head: string,
  signal?: AbortSignal
): Promise<CompareResult> {
  if (!isGithubConfigured()) {
    throw new NotFoundError('github-not-configured');
  }

  const key = `compare:${SITE.github.owner}/${SITE.github.repo}:${base}...${head}`;
  const cached = cacheGet<CompareResult>(key, TTL.compare);
  if (cached) return cached;

  const url = `https://api.github.com/repos/${SITE.github.owner}/${SITE.github.repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`;
  const raw = await ghFetch<RawCompare>(url, signal);

  const files: CompareFile[] = (raw.files ?? [])
    .map((f) => ({
      filename: f.filename,
      previousFilename: f.previous_filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      patch: f.patch,
    }))
    .sort((a, b) => a.filename.localeCompare(b.filename));

  const result: CompareResult = {
    base,
    head,
    status: raw.status,
    aheadBy: raw.ahead_by,
    behindBy: raw.behind_by,
    totalCommits: raw.total_commits,
    files,
    htmlUrl: raw.html_url,
  };
  cacheSet(key, result);
  return result;
}
