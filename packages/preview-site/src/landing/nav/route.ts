/**
 * @file route.ts
 * @description Lightweight client-side router for the preview-site
 * landing. Three known top-level pages — `/`, `/changelog`,
 * `/playground` — so we don't pull in `react-router` or `tanstack-
 * router`. Three primitives are enough:
 *
 *   - `AppRoute`        : union of supported pages.
 *   - `useAppRoute()`   : hook returning the current route; re-subscribes
 *                         on browser navigation (popstate) AND our own
 *                         `eikon:navigate` event so soft-pushes flip
 *                         every subscriber in the same tick.
 *   - `navigate(href)`  : SPA push that updates `history` without a
 *                         reload, then fires `eikon:navigate`. This is
 *                         what turns the home <-> changelog <-> playground
 *                         transition from a hard reload (which flashed
 *                         the whole shell and re-parsed JS) into a
 *                         React state change — only the route subtree
 *                         re-mounts, every other piece of state
 *                         (theme, lang, params, scroll-restoration
 *                         intent) stays alive.
 *
 * The nav still renders real `<a href>` anchors and lets the browser
 * handle modifier-clicks (cmd/ctrl/middle-click). `navigate()` is only
 * called for plain left-clicks — see `Nav.tsx` for the guard.
 */
import { useEffect, useState } from 'react';

export type AppRoute = 'home' | 'changelog' | 'playground';

/** Window event name used to notify subscribers about a soft push. */
const NAVIGATE_EVENT = 'eikon:navigate';

/**
 * Map a `window.location.pathname` onto one of the three known
 * top-level routes. Anything we don't recognise falls back to `home`
 * so deep links into unrelated sub-paths don't grey out the nav.
 */
export function resolveRoute(): AppRoute {
  if (typeof window === 'undefined') return 'home';
  const p = window.location.pathname;
  if (p.startsWith('/changelog')) return 'changelog';
  if (p.startsWith('/playground')) return 'playground';
  return 'home';
}

/**
 * Subscribe to route changes. Updates on:
 *   - back/forward button (popstate)
 *   - SPA push from `navigate()` (eikon:navigate)
 *
 * Both produce the same state update so consumers don't need to care
 * whether the transition came from the user's browser chrome or from
 * an in-app link click.
 */
export function useAppRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(() => resolveRoute());
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => setRoute(resolveRoute());
    window.addEventListener('popstate', sync);
    window.addEventListener(NAVIGATE_EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(NAVIGATE_EVENT, sync);
    };
  }, []);
  return route;
}

/**
 * Soft-navigate to a same-origin path without reloading the page.
 *
 *   - Identical to the current URL: no-op (don't pollute history with
 *     stale dupes when the user re-clicks the active link).
 *   - Different: push (or replace) history then dispatch `eikon:navigate`
 *     so every `useAppRoute()` subscriber re-resolves in the same tick.
 *
 * Callers should still render `<a href>` and only call this inside an
 * `onClick` handler that already preventDefault'd a *plain* left-click
 * — middle-click / cmd-click / ctrl-click should always open in a new
 * tab via the browser's native handler.
 */
export function navigate(
  href: string,
  opts: { replace?: boolean } = {}
): void {
  if (typeof window === 'undefined') return;
  const current =
    window.location.pathname + window.location.search + window.location.hash;
  if (current === href) return;
  if (opts.replace) {
    window.history.replaceState({}, '', href);
  } else {
    window.history.pushState({}, '', href);
  }
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}
