/**
 * @file use-changelog-data.ts
 * @description Async-state hooks wrapping `lib/github` for the
 * changelog page. Each hook owns its own AbortController + a tiny
 * status discriminator so the UI can render five distinct states
 * without a sea of `loading && !error && data` guards.
 *
 * STATE SHAPE
 *
 *   `Async<T>` is a four-arm sum:
 *
 *     - { status: 'idle' }                          — nothing requested yet
 *     - { status: 'loading' }                       — fetch in flight
 *     - { status: 'ready', data: T }                — happy path
 *     - { status: 'error', message: string,         — failure;
 *                          rateLimitedUntil?: Date }   includes a
 *                                                      typed marker for
 *                                                      GitHub rate-limit
 *                                                      throttling so the
 *                                                      page can soften
 *                                                      the message.
 *
 * REFRESH
 *
 *   Each hook returns a `refresh()` callback. It bumps a local nonce
 *   that the fetch effect depends on, so calling refresh forces a
 *   re-run that bypasses both the in-memory cache (cleared via
 *   `invalidateAllChangelogCache`) and any in-flight stale request.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { isGithubConfigured } from '@/lib/site-config';
import {
  compareRefs,
  invalidateAllChangelogCache,
  listReleases,
  NotFoundError,
  RateLimitError,
  type CompareResult,
  type GitHubRelease,
} from '@/lib/github';

import { DEMO_RELEASES, getDemoCompare } from './demo-data';

/**
 * `true` while `SITE.github` is unconfigured. The hooks below
 * short-circuit to the local demo dataset in that case so the
 * changelog surface always has something to render — visitors get a
 * concrete preview, maintainers can iterate on visuals without
 * standing up a real fixture repo. Computed at module load: a
 * reload is required to flip in/out of demo mode (matches the rest
 * of `site-config`'s static-import semantics).
 */
export const isDemoMode = !isGithubConfigured();

export type Async<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | {
      status: 'error';
      message: string;
      rateLimitedUntil?: Date;
      /**
       * `true` when GitHub returned 404 — typically because the
       * configured repo doesn't exist (or is private). The Changelog
       * page treats this as a friendly empty state instead of a red
       * error panel, since "no data" is more accurate than "broken".
       */
      notFound?: boolean;
    };

interface AsyncHook<T> {
  state: Async<T>;
  refresh: () => void;
}

/**
 * Load the published-releases list. Re-runs on `refresh()`.
 *
 * `refresh` invalidates the WHOLE changelog cache (releases AND every
 * cached compare) — refreshes are user-initiated and the cost of a
 * second compare on the next click is a fair price for "actually
 * give me fresh data".
 */
export function useReleases(): AsyncHook<GitHubRelease[]> {
  // In demo mode we return the static dataset synchronously without
  // ever entering the fetch effect. `loading` would visibly flash
  // for one frame on slower devices and there's no real loading
  // happening — so we avoid setting it.
  const [state, setState] = useState<Async<GitHubRelease[]>>(() =>
    isDemoMode
      ? { status: 'ready', data: DEMO_RELEASES }
      : { status: 'idle' }
  );
  const [nonce, setNonce] = useState(0);

  // Track the latest nonce in a ref so an in-flight fetch from a
  // superseded run knows it should drop its result.
  const latest = useRef(nonce);
  latest.current = nonce;

  useEffect(() => {
    if (isDemoMode) {
      setState({ status: 'ready', data: DEMO_RELEASES });
      return;
    }
    const ctrl = new AbortController();
    setState({ status: 'loading' });
    listReleases(ctrl.signal)
      .then((data) => {
        if (latest.current !== nonce) return;
        setState({ status: 'ready', data });
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        if (latest.current !== nonce) return;
        setState(asyncErrorFrom(e));
      });
    return () => ctrl.abort();
  }, [nonce]);

  const refresh = useCallback(() => {
    if (isDemoMode) return; // Demo dataset is static; nothing to refresh.
    invalidateAllChangelogCache();
    setNonce((n) => n + 1);
  }, []);

  return { state, refresh };
}

/**
 * Compare two refs. Returns `idle` until BOTH refs are present so the
 * UI doesn't flicker into a "loading" state before it has even decided
 * which versions to compare.
 */
export function useCompare(
  base: string | null,
  head: string | null
): AsyncHook<CompareResult> {
  const [state, setState] = useState<Async<CompareResult>>({ status: 'idle' });
  const [nonce, setNonce] = useState(0);
  const latest = useRef(nonce);
  latest.current = nonce;

  useEffect(() => {
    if (!base || !head) {
      setState({ status: 'idle' });
      return;
    }
    if (base === head) {
      // GitHub returns 404 / empty for `tag...tag`. Short-circuit so the
      // UI shows a friendly "identical" hint instead of a network error.
      setState({ status: 'ready', data: identicalCompare(base, head) });
      return;
    }
    if (isDemoMode) {
      // Demo path: serve a baked-in compare for known pairs, fall
      // back to the "identical" placeholder for any other pair we
      // didn't author. Matches the swap behaviour the user is
      // likely to try first without us pre-authoring 6 directions.
      const demo = getDemoCompare(base, head);
      setState({
        status: 'ready',
        data: demo ?? identicalCompare(base, head),
      });
      return;
    }
    const ctrl = new AbortController();
    setState({ status: 'loading' });
    compareRefs(base, head, ctrl.signal)
      .then((data) => {
        if (latest.current !== nonce) return;
        setState({ status: 'ready', data });
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        if (latest.current !== nonce) return;
        setState(asyncErrorFrom(e));
      });
    return () => ctrl.abort();
  }, [base, head, nonce]);

  const refresh = useCallback(() => {
    if (isDemoMode) return;
    invalidateAllChangelogCache();
    setNonce((n) => n + 1);
  }, []);

  return { state, refresh };
}

function identicalCompare(base: string, head: string): CompareResult {
  return {
    base,
    head,
    status: 'identical',
    aheadBy: 0,
    behindBy: 0,
    totalCommits: 0,
    files: [],
    htmlUrl: '',
  };
}

/**
 * Map an arbitrary thrown value into our `Async<_>` error shape.
 * Special-cases `RateLimitError` so the renderer can surface a
 * "try again at HH:MM" hint instead of generic "GitHub 403".
 */
function asyncErrorFrom(e: unknown): Async<never> {
  if (e instanceof RateLimitError) {
    return {
      status: 'error',
      message: e.message,
      rateLimitedUntil: e.resetAt ?? undefined,
    };
  }
  if (e instanceof NotFoundError) {
    return { status: 'error', message: e.message, notFound: true };
  }
  if (e instanceof Error) {
    return { status: 'error', message: e.message };
  }
  return { status: 'error', message: String(e) };
}
