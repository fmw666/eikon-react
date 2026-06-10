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
 * COMPOSITION
 *
 *   The mechanics live in three internal siblings so this file stays a
 *   thin orchestration layer. They're stitched back together here so the
 *   public `@/lib/github` import path and exports are unchanged:
 *
 *     - github-types.ts  — public payload shapes (GitHubRelease, etc.).
 *     - github-cache.ts  — three-tier memory/localStorage/TTL cache; the
 *                          per-endpoint TTL rationale (60 min releases,
 *                          7 day compares) lives in that file's header.
 *     - github-http.ts   — fetch wrapper + typed RateLimit/NotFound errors.
 *
 * STALE-WHILE-ERROR FALLBACK
 *
 *   When a network call fails (rate-limit, offline, GitHub outage), we
 *   don't blow away the page — we serve the LAST cached value even if its
 *   TTL has expired (`cacheGetStale`). The visitor sees slightly-old data
 *   instead of an empty error panel, the right trade for a read-only
 *   marketing surface. Only when there's NO cache at all (cold cache +
 *   rate-limited) does the original error propagate to the UI.
 */

import { isGithubConfigured, SITE } from './site-config';

import {
  cacheGet,
  cacheGetStale,
  cacheSet,
  TTL,
} from './github-cache';
import { ghFetch, NotFoundError } from './github-http';
import type {
  CompareFile,
  CompareResult,
  FileChangeStatus,
  GitHubRelease,
} from './github-types';

// Re-export the public surface so consumers keep importing from
// `@/lib/github` with zero changes.
export type {
  CompareFile,
  CompareResult,
  FileChangeStatus,
  GitHubRelease,
} from './github-types';
export {
  invalidateAllChangelogCache,
  invalidateCacheKey,
} from './github-cache';
export { NotFoundError, RateLimitError } from './github-http';

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
  try {
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
  } catch (err) {
    // Network failed (rate-limit, offline, GitHub outage). Serve the
    // last known release list even if its TTL is long blown — visitors
    // get an obviously-old changelog instead of an error panel, which
    // is the right trade for a read-only marketing page. Only when
    // the cache is genuinely empty (first visit + GitHub down) do we
    // let the error bubble up.
    if (signal?.aborted) throw err;
    const stale = cacheGetStale<GitHubRelease[]>(key);
    if (stale) {
      if (typeof console !== 'undefined') {
        console.warn(
          '[github] releases fetch failed, serving stale cache:',
          err
        );
      }
      return stale;
    }
    throw err;
  }
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
  try {
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
  } catch (err) {
    // Same stale-while-error policy as listReleases. compare(A,B) for a
    // tag pair is immutable, so a stale value is actually CORRECT — not
    // a degradation — as long as both tags still exist. We don't bother
    // distinguishing rate-limit from a genuine 404 here: NotFoundError
    // means the upstream ref is gone, which is a real error the visitor
    // needs to see (so they can pick a different pair). Stale cache only
    // catches the other failure modes.
    if (signal?.aborted) throw err;
    if (err instanceof NotFoundError) throw err;
    const stale = cacheGetStale<CompareResult>(key);
    if (stale) {
      if (typeof console !== 'undefined') {
        console.warn(
          '[github] compare fetch failed, serving stale cache:',
          err
        );
      }
      return stale;
    }
    throw err;
  }
}
