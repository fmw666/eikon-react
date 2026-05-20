/**
 * @file Nav.tsx
 * @description Sticky centred pill nav — SuperWhisper-style.
 *
 * The entire navigation is a single centred floating pill that holds:
 *
 *   ┌─ Home   Changelog   [▶ Playground]   🌐 ─┐
 *   └─────────── centred island ───────────────┘
 *
 * No brand mark, no GitHub icon, no theme toggle — those either live
 * elsewhere on the page (Footer carries GitHub + author email) or are
 * gated behind a future iteration (theme toggle is off until we ship
 * a polished light palette).
 *
 * Visual model: there is no `<header>` chrome at all — no background,
 * no border, no blurred backdrop, no scroll-state transitions. The
 * header element is just a transparent positioner that keeps the pill
 * island pinned to the top of the viewport while the rest of the page
 * scrolls behind it.
 *
 * Because the header has no fill, the wrapper sets
 * `pointer-events-none` so the empty area on either side of the pill
 * doesn't swallow clicks meant for content underneath; the pill
 * itself re-enables pointer events with `pointer-events-auto`.
 *
 * IMPORTANT: keep this region's total height in sync with the
 * `NAV_REGION_HEIGHT_REM` constant — pages that fill the viewport
 * (e.g. `/playground`) subtract it from `100vh` to size themselves.
 */

import { useEffect, useState, type ReactNode } from 'react';

import { useI18n } from '../theme/i18n';

import { LangSwitcher } from './LangSwitcher';

/** Path used by the Playground CTA — full-screen dedicated route. */
const PLAYGROUND_PATH = '/playground';

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

export function Nav() {
  const { t } = useI18n();
  const route = useCurrentRoute();

  return (
    <header
      aria-label="Site"
      className="pointer-events-none sticky top-0 z-40 w-full"
    >
      <div className="mx-auto flex max-w-7xl justify-center px-6 pt-6 pb-4">
        <div className="pointer-events-auto">
          <NavPill>
            <PillLink href="/" active={route === 'home'}>
              {t('nav.home')}
            </PillLink>
            <PillLink
              href="/changelog"
              active={route === 'changelog'}
            >
              {t('nav.changelog')}
            </PillLink>
            <PlaygroundPillCta label={t('nav.playground')} />

            {/* Tiny divider between the CTA and utility icons —
                same visual weight as the surface-2 background so it
                reads as separation, not partition. */}
            <span
              aria-hidden="true"
              className="mx-0.5 h-5 w-px bg-[var(--border-1)]"
            />

            <LangSwitcher compact />
          </NavPill>
        </div>
      </div>
    </header>
  );
}

// =============================================================================
// Pill island
// =============================================================================

/**
 * The dark pill container that houses every nav item. Background uses
 * `surface-2` so it stands out from a transparent (top-of-page) header
 * but still reads as part of the same chrome once the header itself
 * gets its blurred backdrop on scroll. Inset top highlight + subtle
 * outer shadow give it the floating-island look.
 */
function NavPill({ children }: { children: ReactNode }) {
  return (
    <nav
      aria-label="Primary"
      className="inline-flex items-center gap-0.5 rounded-full border border-[var(--border-1)] bg-[var(--surface-2)] p-1 shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_2px_8px_rgb(0_0_0/0.08)]"
    >
      {children}
    </nav>
  );
}

/**
 * Text link inside the pill island. Pure-text affordance — no border,
 * no background, no fill. The active vs idle distinction is carried
 * by opacity alone:
 *
 *   - Active (current route)  : white @ 80% — bright enough to read
 *                               as "I'm here" without shouting.
 *   - Idle  (other routes)    : white @ 35% — still legible at glance
 *                               but visibly secondary.
 *   - Hover (idle)            : briefly bumps to 80% so the item
 *                               telegraphs interactivity without
 *                               adding any chrome.
 *
 * Hover animation: instead of a generic `transition-colors`, we
 * cross-fade between two stacked label copies — one rendered at the
 * idle alpha, one at the active alpha. The active copy lives in an
 * absolute overlay that's `opacity-0` by default and animates to
 * `opacity-100` on hover. Cross-fading two pre-rendered colours reads
 * as a much smoother visual than the browser's default alpha
 * interpolation on `color`, especially on long words like
 * "Changelog" where a mid-blend looks muddy.
 *
 * Values picked to match the user-supplied design tokens; hard-coded
 * rgba so they look identical regardless of theme (the surrounding
 * pill is dark, so white-with-alpha is the right primitive).
 */
function PillLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  // Active route: render a single static copy at 80% — no hover state
  // since the user is already there.
  if (active) {
    return (
      <a
        href={href}
        aria-current="page"
        className="rounded-full px-3.5 py-1.5 text-sm font-medium text-[hsla(0,0%,100%,0.8)] no-underline"
      >
        {children}
      </a>
    );
  }

  // Idle route: stack two label copies and cross-fade them on hover.
  // The wrapper carries `relative` so the absolute overlay can pin
  // to the same box; `group` lets the overlay listen to the parent's
  // hover state.
  return (
    <a
      href={href}
      className="group relative inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-sm font-medium no-underline"
    >
      {/* Idle copy — visible by default, fades out on hover. */}
      <span className="text-[hsla(0,0%,100%,0.35)] transition-opacity duration-300 ease-out group-hover:opacity-0">
        {children}
      </span>
      {/* Active-colour copy — invisible by default, fades in on hover. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-[hsla(0,0%,100%,0.8)] opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
      >
        {children}
      </span>
    </a>
  );
}

/**
 * The "Playground" CTA — white, textured, glassy. Implemented as a
 * stack of:
 *
 *   1. Top-to-bottom gradient (`white → off-white`) for a soft
 *      ceramic feel — pure flat white reads as a print swatch, not a
 *      surface.
 *   2. Inset top highlight to lift the upper edge.
 *   3. Subtle drop shadow that doubles as a faint outline so the
 *      button still detaches from the dark pill background.
 *   4. A small play-triangle icon on the left, hinting at the
 *      interactive nature of the destination (a live playground).
 *
 * The hover state intensifies the highlight + raises the button by
 * one pixel — a touch of bounce without sliding into "neon" territory.
 */
function PlaygroundPillCta({ label }: { label: string }) {
  // Standard `<a href>` navigation — the playground lives at its own
  // path, so a hard navigation is the right answer (the params store
  // re-hydrates from URL + localStorage on the other side, so nothing
  // is lost). Clicking the CTA while already on /playground falls
  // back to the browser's no-op behaviour.
  return (
    <a
      href={PLAYGROUND_PATH}
      className="group ml-1 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-white to-zinc-200 px-3.5 py-1.5 text-sm font-medium text-zinc-900 no-underline shadow-[inset_0_1px_0_rgb(255_255_255/0.9),inset_0_-1px_0_rgb(0_0_0/0.08),0_1px_2px_rgb(0_0_0/0.25),0_4px_10px_rgb(0_0_0/0.15)] transition-all duration-150 hover:-translate-y-px hover:from-white hover:to-zinc-100 hover:shadow-[inset_0_1px_0_rgb(255_255_255/1),inset_0_-1px_0_rgb(0_0_0/0.08),0_2px_4px_rgb(0_0_0/0.25),0_6px_14px_rgb(0_0_0/0.2)] active:translate-y-0"
    >
      <PlayIcon className="h-3 w-3 fill-zinc-900 text-zinc-900" />
      <span>{label}</span>
    </a>
  );
}

// =============================================================================
// Route helper
// =============================================================================

type NavRoute = 'home' | 'changelog' | 'playground';

/**
 * Hook: return the active top-level route. Re-evaluates on `popstate`
 * so the browser Back/Forward buttons keep the pill highlight in sync.
 *
 * Recognises three paths:
 *   /            → 'home'
 *   /playground… → 'playground'
 *   /changelog…  → 'changelog'
 *
 * Anything else falls back to 'home' so unrelated subpaths don't
 * cause every text link to dim out.
 */
function useCurrentRoute(): NavRoute {
  const [route, setRoute] = useState<NavRoute>(() => detectRoute());
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => setRoute(detectRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return route;
}

function detectRoute(): NavRoute {
  if (typeof window === 'undefined') return 'home';
  const p = window.location.pathname;
  if (p.startsWith('/changelog')) return 'changelog';
  if (p.startsWith('/playground')) return 'playground';
  return 'home';
}

// =============================================================================
// Icons
// =============================================================================

function PlayIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
