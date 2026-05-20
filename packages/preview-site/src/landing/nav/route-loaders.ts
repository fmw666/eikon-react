/**
 * @file route-loaders.ts
 * @description Lazy-chunk loaders for each top-level route + the
 * prefetch table the Nav uses to warm them on hover/focus.
 *
 * Why this lives in its own module:
 *
 *   1. Same `import()` call is used both by `LandingPage.tsx` (passed
 *      to `React.lazy`) AND by the Nav (`ROUTE_PREFETCH[key]()` on
 *      hover). Webpack/Vite memoise per loader identity, so reusing
 *      the *same function reference* guarantees that the hover-time
 *      `import()` and the click-time `React.lazy` resolve to the same
 *      chunk promise — the second call hits the cache instantly.
 *
 *   2. Keeping ROUTE_PREFETCH out of `LandingPage.tsx` lets the page
 *      module export only components, which satisfies the
 *      `react-refresh/only-export-components` rule (HMR boundaries
 *      stay clean).
 *
 *   3. The Nav now depends on a tiny loader module rather than the
 *      whole LandingPage tree, which sidesteps any future circular-
 *      import risk (LandingPage already imports Nav).
 *
 * Home ships with the initial bundle, so its loader is a resolved
 * no-op — present only so callers can write `ROUTE_PREFETCH[route]()`
 * generically without a per-route branch.
 */
import type { AppRoute } from './route';

/** Lazy `import()` for the `/playground` route bundle. */
export const loadPlayground = () => import('../PlaygroundPage');

/** Lazy `import()` for the `/changelog` route bundle. */
export const loadChangelog = () => import('../changelog/ChangelogPage');

/**
 * Per-route chunk loader keyed by `AppRoute`. The Nav calls
 * `ROUTE_PREFETCH[key]()` the first time a link is hovered/focused
 * so the chunk is already in memory by the time the user clicks —
 * the route swap then happens without the Suspense fallback ever
 * mounting on a fast network.
 */
export const ROUTE_PREFETCH: Record<AppRoute, () => Promise<unknown>> = {
  home: () => Promise.resolve(),
  changelog: loadChangelog,
  playground: loadPlayground,
};
