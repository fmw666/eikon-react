/**
 * @file github-http.ts
 * @description HTTP plumbing + typed error model for the GitHub changelog client.
 *
 * Internal to `github.ts`, which re-exports the two error classes so the
 * public `@/lib/github` surface is unchanged.
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
 *
 *   We do NOT use ETags / If-None-Match — the simpler TTL model is
 *   plenty for a public marketing-side changelog and avoids a class
 *   of "stale despite 304" bugs.
 */

const REQUEST_HEADERS: HeadersInit = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

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
export async function ghFetch<T>(
  url: string,
  signal?: AbortSignal
): Promise<T> {
  const res = await fetch(url, {
    headers: REQUEST_HEADERS,
    signal,
  });
  if (res.status === 200) return (await res.json()) as T;
  if (res.status === 403) {
    const rem = res.headers.get('X-RateLimit-Remaining');
    if (rem === '0') {
      const reset = res.headers.get('X-RateLimit-Reset');
      throw new RateLimitError(reset ? new Date(Number(reset) * 1000) : null);
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
