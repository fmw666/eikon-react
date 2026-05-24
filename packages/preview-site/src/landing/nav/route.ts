import { useEffect, useState } from 'react';

export type AppRoute = 'home' | 'changelog' | 'playground';

const NAVIGATE_EVENT = 'eikon:navigate';

const ROUTE_ORDER: Record<AppRoute, number> = {
  home: 0,
  changelog: 1,
  playground: 2,
};

export function resolveRoute(): AppRoute {
  if (typeof window === 'undefined') return 'home';
  const p = window.location.pathname;
  if (p.startsWith('/changelog')) return 'changelog';
  if (p.startsWith('/playground')) return 'playground';
  return 'home';
}

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

/** Whether the browser supports View Transitions. */
export const supportsViewTransitions =
  typeof document !== 'undefined' &&
  typeof document.startViewTransition === 'function';

/**
 * Soft-navigate with View Transitions API when supported.
 * Sets `data-nav-direction` on `<html>` for directional CSS.
 */
export function navigate(
  href: string,
  opts: { replace?: boolean } = {}
): void {
  if (typeof window === 'undefined') return;
  const current =
    window.location.pathname + window.location.search + window.location.hash;
  if (current === href) return;

  const prevRoute = resolveRoute();

  if (opts.replace) {
    window.history.replaceState({}, '', href);
  } else {
    window.history.pushState({}, '', href);
  }

  const nextRoute = resolveRoute();
  const direction =
    ROUTE_ORDER[nextRoute] >= ROUTE_ORDER[prevRoute] ? 'forward' : 'back';
  document.documentElement.dataset.navDirection = direction;

  if (supportsViewTransitions) {
    document.startViewTransition(() => {
      window.dispatchEvent(new Event(NAVIGATE_EVENT));
    });
  } else {
    window.dispatchEvent(new Event(NAVIGATE_EVENT));
  }
}

/**
 * Hook that intercepts popstate before useAppRoute and wraps
 * the state update in a View Transition for animated back/forward.
 * Registers in the capture phase to guarantee it runs first.
 */
export function usePopstateViewTransition(): void {
  useEffect(() => {
    if (!supportsViewTransitions) return;

    let lastRoute = resolveRoute();

    const onPopstate = (e: PopStateEvent) => {
      e.stopImmediatePropagation();

      const prevRoute = lastRoute;
      const nextRoute = resolveRoute();
      lastRoute = nextRoute;

      const direction =
        ROUTE_ORDER[nextRoute] >= ROUTE_ORDER[prevRoute] ? 'forward' : 'back';
      document.documentElement.dataset.navDirection = direction;

      document.startViewTransition(() => {
        window.dispatchEvent(new Event(NAVIGATE_EVENT));
      });
    };

    window.addEventListener('popstate', onPopstate, true);
    return () => window.removeEventListener('popstate', onPopstate, true);
  }, []);
}
