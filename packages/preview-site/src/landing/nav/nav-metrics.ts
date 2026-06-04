/**
 * @file nav-metrics.ts
 * @description Layout metrics for the nav region, kept in a leaf module
 * so viewport-filling pages can read them WITHOUT importing the Nav
 * component itself.
 *
 * Why this is its own module:
 *
 *   Pages like `/playground` need to subtract the nav's visual height
 *   from `100vh` to size themselves. If they imported that number from
 *   `Nav.tsx` they'd pull in the whole Nav component — and because the
 *   Nav (via its route-loaders) dynamically imports those same pages,
 *   that created a circular dependency
 *   (`Nav → route-loaders → PlaygroundPage → Nav`).
 *
 *   Parking the constant in this dependency-free leaf breaks that
 *   back-edge: pages depend on the metric, not on the component. `Nav.tsx`
 *   re-exports `NAV_REGION_HEIGHT_REM` so its public surface is unchanged.
 */

/**
 * Approximate total visual height of the nav region (top padding +
 * pill island + bottom padding). Exported so layout-critical pages
 * can compute `100vh - NAV_REGION_HEIGHT_REM` without duplicating
 * the magic number.
 *
 * Measured: pt-6 (1.5rem) + pill (~2.5rem) + pb-4 (1rem) ≈ 5rem.
 * Pages that subtract this from `100vh` should round to whole `rem`
 * to avoid sub-pixel rounding triggering a spurious 1px scrollbar.
 */
export const NAV_REGION_HEIGHT_REM = 5;
