/**
 * @file Nav.tsx
 * @description Sticky centred two-island nav with a magic indicator,
 * scroll-state glass, SPA route swaps and hover-time chunk prefetch.
 *
 *   ┌─ Home  Changelog  [▶ Playground] ─┐   ┌─ 🌐 ─┐
 *   └─────── main pill ─────────────────┘   └ orb ┘
 *                          gap-2.5
 *
 * This file is the thin orchestrator. The pieces it composes live in
 * sibling modules so each stays small enough to hold in one pass:
 *
 *   - `NavPill`     ({@link ./NavPill}) — the dark route-nav pill and
 *                   its MAGIC INDICATOR (a single `<span>` measured via
 *                   `getBoundingClientRect` off the active/hovered link,
 *                   spring-eased on the macOS window-snap curve). Hover
 *                   is published through one delegated `data-nav-key`
 *                   pointerover handler — no per-link wiring.
 *   - `NavLink` / `PlaygroundCta` / `LangOrb` ({@link ./NavLinks}) —
 *                   the leaves. Links do SPA NAVIGATION (plain
 *                   left-click → `navigate()`, modifier-clicks fall
 *                   through to the browser) and PREFETCH ON HOVER/FOCUS
 *                   (`ROUTE_PREFETCH[key]()` once per session warms the
 *                   lazy chunk before the click lands).
 *   - `useScrolled` ({@link ./useScrolled}) — SCROLL-STATE GLASS: flips
 *                   the pill + orb from flat to `backdrop-blur-xl` once
 *                   past 8px, on compositor-only properties.
 *
 * The two floating islands carry no header chrome — the `<header>` is a
 * transparent `pointer-events-none` positioner; only the inner pill +
 * orb paint and capture clicks. Splitting the language switch into its
 * own satellite orb keeps it out of the pill's rail so it can never tug
 * the magic indicator.
 *
 * IMPORTANT: keep the region's total visual height in sync with
 * `NAV_REGION_HEIGHT_REM` — pages that fill the viewport (e.g.
 * `/playground`) subtract it from `100vh` to size themselves.
 */

import { useI18n } from '../theme/i18n';

import { LangSwitcher } from './LangSwitcher';
import { LoadingBar } from './LoadingBar';
import { NAV_REGION_HEIGHT_REM } from './nav-metrics';
import {
  CHANGELOG_PATH,
  HOME_PATH,
  LangOrb,
  NavLink,
  PlaygroundCta,
} from './NavLinks';
import { NavPill, type TrackedKey } from './NavPill';
import { type AppRoute } from './route';
import { useScrolled } from './useScrolled';

/**
 * Re-exported from the leaf `nav-metrics` module so the Nav's public
 * surface is unchanged for callers that already import it here. The
 * canonical definition lives in `nav-metrics.ts` — layout-critical
 * pages should import it from there to avoid pulling in the Nav
 * component (and the route-loaders → page dynamic-import back-edge).
 */
export { NAV_REGION_HEIGHT_REM };

/**
 * Props are deliberately *external* so LandingPage owns the source of
 * truth for the current route and for navigation-pending state. That
 * lets the page coordinate two things in lockstep:
 *
 *   - `route`   : flips synchronously on link click (intent), drives
 *                 the Nav's active highlight + magic indicator. The
 *                 user sees their click land immediately.
 *   - `pending` : true while the deferred / committed route is still
 *                 catching up (e.g. lazy chunk loading). Drives the
 *                 LoadingBar at the very top of the viewport.
 *
 * Keeping these as props (instead of letting Nav read the router
 * directly) avoids a second `useAppRoute()` subscription with its
 * own renderer cadence, and lets tests render the Nav at any state
 * without spinning up history mocks.
 */
export function Nav({ route, pending }: { route: AppRoute; pending: boolean }) {
  const { t, lang } = useI18n();
  const scrolled = useScrolled(8);

  // The magic indicator only tracks the *flat* links inside the rail
  // (home, changelog). The Playground item is a glossy white CTA chip
  // — it carries its own visual selected state via the route-equal
  // class, so we exclude it from indicator tracking and let it stand
  // out on its own.
  const indicatorActive: TrackedKey | null =
    route === 'home' ? 'home' : route === 'changelog' ? 'changelog' : null;

  return (
    <>
      {/* Top-of-viewport navigation progress bar. Lives outside the
          `<header>` because it's pinned to `top: 0` of the viewport
          rather than to the Nav region — that way it stays put even
          if the Nav scales / glassifies on scroll. */}
      <LoadingBar pending={pending} />

      <header
        aria-label="Site"
        // `safe-area-inset-top` keeps the pill clear of iOS notches.
        // We use `max()` with a 1.5rem floor so the visual top
        // padding doesn't collapse to 0 on devices without an inset.
        // `eikon-nav-glass` is a tagging class the responsive
        // overrides in styles/index.css use to turn off the
        // expensive backdrop-blur on touch viewports.
        className="eikon-nav-glass pointer-events-none sticky top-0 z-40 w-full"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div
          className={
            'mx-auto flex max-w-7xl items-end justify-center gap-2 px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-3 transition-transform duration-300 ease-out sm:gap-2.5 sm:px-6 sm:pt-6 sm:pb-4 ' +
            (scrolled ? 'scale-[0.985]' : 'scale-100')
          }
          data-scrolled={scrolled || undefined}
        >
          {/* Main island: route navigation. */}
          <div className="pointer-events-auto">
            <NavPill
              activeKey={indicatorActive}
              scrolled={scrolled}
              measureSignal={lang}
            >
              <NavLink
                navKey="home"
                href={HOME_PATH}
                active={route === 'home'}
              >
                {t('nav.home')}
              </NavLink>
              <NavLink
                navKey="changelog"
                href={CHANGELOG_PATH}
                active={route === 'changelog'}
              >
                {t('nav.changelog')}
              </NavLink>
              <PlaygroundCta
                label={t('nav.playground')}
                active={route === 'playground'}
              />
            </NavPill>
          </div>

          {/* Satellite orb: utility chrome (language switch). Same
              glass material as the pill so the two islands breathe
              together on scroll. The orb is a perfect circle and
              meaningfully smaller than the pill; the outer flex row
              uses `items-end` so the orb is anchored to the pill's
              bottom edge (not vertically centered), giving the
              cluster a "main pill + small moon hanging at the
              lower-right" silhouette instead of "two siblings
              floating mid-air". */}
          <div className="pointer-events-auto">
            <LangOrb scrolled={scrolled}>
              <LangSwitcher compact />
            </LangOrb>
          </div>
        </div>
      </header>
    </>
  );
}

export type { AppRoute };
