/**
 * @file Nav.tsx
 * @description Sticky centred two-island nav with a magic indicator,
 * scroll-state glass, SPA route swaps and hover-time chunk prefetch.
 *
 *   ┌─ Home  Changelog  [▶ Playground] ─┐   ┌─ 🌐 ─┐
 *   └─────── main pill ─────────────────┘   └ orb ┘
 *                          gap-2.5
 *
 * What's intentional about this nav:
 *
 *   1. TWO FLOATING ISLANDS, NO HEADER CHROME — the `<header>` itself
 *      is a transparent positioner; only the inner pill + orb paint
 *      anything. The empty area around them is `pointer-events-none`
 *      so it never swallows clicks meant for the content scrolling
 *      behind. Splitting the language switch into its own small orb
 *      (instead of cramming it inside the pill behind a hairline
 *      divider) gives the cluster a "main subject + satellite" read
 *      — the pill carries route intent, the orb carries chrome — and
 *      lets the negative space between them do real composition work
 *      instead of being decorative padding.
 *
 *   2. MAGIC INDICATOR — a single `<span>` sitting underneath the pill
 *      links. Its `translate3d` + `width` are driven by measuring the
 *      currently-active OR currently-hovered link via `getBoundingClient
 *      Rect`. The spring-ish `cubic-bezier(0.32, 0.72, 0, 1)` is the
 *      curve macOS uses for its window-snap behaviour — fast start,
 *      languid settle — so the pill reads as "physical thing sliding
 *      into place" rather than "div changing colour".
 *
 *      Two visual states (`isGhost`):
 *          - hover on a non-active link  → dim background (preview)
 *          - resting on the active link  → brighter background + 1px
 *                                          inset top highlight
 *      Hover state is published via `data-nav-key` + a single
 *      pointerover handler on the rail (no per-link event hookup).
 *      Anything inside the rail without a `data-nav-key` reads as
 *      "no link hovered" and the indicator retreats to the active
 *      link — moving the language switch out of the rail entirely
 *      makes that contract even cleaner: the orb is on its own
 *      surface and cannot accidentally tug the indicator at all.
 *
 *   3. SCROLL-STATE GLASS — `useScrolled(8)` flips a class once the
 *      viewport is past 8px so the pill switches from flat to
 *      `backdrop-blur-xl` + deeper shadow + a touch of `scale(0.985)`
 *      on the outer wrapper. The shift is on `transform / background-
 *      color / box-shadow` only (cheap to composite) — no layout
 *      thrash, no height change.
 *
 *   4. SPA NAVIGATION — link clicks call `navigate(href)` instead of
 *      letting the browser do a hard load. The original `<a href>` is
 *      preserved so:
 *           - cmd/ctrl/middle-click open in a new tab (browser
 *             handles them natively),
 *           - SEO + right-click "Copy link address" still work,
 *           - keyboard activation flows through the anchor too.
 *      A plain left-click is preventDefault'd and routed through
 *      `navigate()`, which updates `history` and fires the same
 *      route-change event the back button does.
 *
 *   5. PREFETCH ON HOVER / FOCUS — the moment the cursor enters a
 *      non-active link we call `ROUTE_PREFETCH[key]()` (just once
 *      per session per link). This warms the lazy chunk; by the
 *      time the click happens the new page renders without showing
 *      the Suspense fallback at all on a fast network.
 *
 * IMPORTANT: keep the region's total visual height in sync with
 * `NAV_REGION_HEIGHT_REM` — pages that fill the viewport (e.g.
 * `/playground`) subtract it from `100vh` to size themselves.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

import { useI18n } from '../theme/i18n';

import { LangSwitcher } from './LangSwitcher';
import { LoadingBar } from './LoadingBar';
import { navigate, type AppRoute } from './route';
import { ROUTE_PREFETCH } from './route-loaders';

const HOME_PATH = '/';
const CHANGELOG_PATH = '/changelog';
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

/** Modifier-aware "is this a plain left-click I should intercept" guard. */
function isPlainLeftClick(e: ReactMouseEvent): boolean {
  return (
    e.button === 0 &&
    !e.metaKey &&
    !e.ctrlKey &&
    !e.altKey &&
    !e.shiftKey
  );
}

// =============================================================================
// Top-level component
// =============================================================================

/**
 * Props are deliberately *external* so LandingPage owns the source of
 * truth for the current route and for navigation-pending state. That
 * lets the page coordinate three things in lockstep:
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

// =============================================================================
// Scroll observer
// =============================================================================

/**
 * `true` once the viewport has scrolled past `threshold` pixels.
 * The scroll listener is `passive: true` + RAF-throttled so it never
 * forces React into a render storm on long scrolls — at most one
 * state update per frame, and only when the boolean actually flips.
 */
function useScrolled(threshold: number): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let raf = 0;
    let last = false;
    const measure = () => {
      raf = 0;
      const next = window.scrollY > threshold;
      if (next !== last) {
        last = next;
        setScrolled(next);
      }
    };
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [threshold]);
  return scrolled;
}

// =============================================================================
// Pill rail + Magic indicator
// =============================================================================

/** Keys the magic indicator is allowed to land on. */
type TrackedKey = 'home' | 'changelog';

/**
 * The dark pill container that houses route navigation. Carries the
 * indicator span and one delegated pointerover handler that watches
 * `data-nav-key` to publish hover state — no per-link wiring needed.
 * Anything inside without a `data-nav-key` (e.g. a future utility
 * icon) reads as "no link hovered" and the indicator retreats to
 * the active link.
 *
 * Background / shadow / border are driven by `scrolled`: at the top
 * of the page the pill sits flat against the hero; once the user
 * scrolls past 8px we glass it (backdrop-blur + deeper shadow + a
 * slightly tighter outline) so it reads as floating chrome over
 * the scrolling content. The companion `LangOrb` mirrors this exact
 * surface so the two islands inhale and exhale on scroll together.
 */
function NavPill({
  children,
  activeKey,
  scrolled,
  measureSignal,
}: {
  children: ReactNode;
  activeKey: TrackedKey | null;
  scrolled: boolean;
  /** Re-measure trigger — pass anything that changes link widths
   *  (e.g. current language). */
  measureSignal: unknown;
}) {
  const rowRef = useRef<HTMLElement>(null);
  const [hovered, setHovered] = useState<TrackedKey | null>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  // The indicator must not animate on its very first paint (it would
  // visibly slide in from `left: 0`). We flip this on after the first
  // measurement so subsequent moves get the spring transition.
  const [primed, setPrimed] = useState(false);

  const targetKey: TrackedKey | null = hovered ?? activeKey;

  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row || !targetKey) return;
    const el = row.querySelector(
      `[data-nav-key="${targetKey}"]`
    ) as HTMLElement | null;
    if (!el) return;
    const rowRect = row.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setIndicator({
      left: elRect.left - rowRect.left,
      width: elRect.width,
    });
  }, [targetKey]);

  // First/sync measurement: runs synchronously after layout so the
  // indicator lands in the correct spot before the browser paints
  // (no flash from the previous position).
  useLayoutEffect(() => {
    measure();
    // Enable transitions starting on the *next* frame so the first
    // paint at the measured position is instant, not animated.
    const id =
      typeof window !== 'undefined'
        ? window.requestAnimationFrame(() => setPrimed(true))
        : 0;
    return () => {
      if (typeof window !== 'undefined' && id) window.cancelAnimationFrame(id);
    };
  }, [measure, measureSignal]);

  // Re-measure on resize — covers viewport resizes AND content
  // changes inside the links (e.g. a language switch changing
  // "更新日志" to "Changelog" which has a different width).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const row = rowRef.current;
    if (!row) return;
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    row.querySelectorAll('[data-nav-key]').forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [measure]);

  // Pointer delegation: read `data-nav-key` from the closest ancestor
  // and publish it. Anything inside the rail without a key (the
  // divider, the language switcher) reads as "no link hovered" and
  // the indicator retreats to the active key.
  const onPointerOver = (e: ReactPointerEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null;
    const el = target?.closest?.('[data-nav-key]') as HTMLElement | null;
    const raw = el?.dataset.navKey;
    const next: TrackedKey | null =
      raw === 'home' || raw === 'changelog' ? raw : null;
    setHovered((prev) => (prev === next ? prev : next));
  };

  const isGhost = hovered !== null && hovered !== activeKey;
  const showIndicator = targetKey !== null && indicator.width > 0;

  const railClass =
    'eikon-nav-glass relative isolate inline-flex items-center gap-0 rounded-full border p-0.5 transition-[background-color,box-shadow,border-color] duration-300 ease-out sm:gap-0.5 sm:p-1 ' +
    (scrolled
      ? 'border-[var(--border-2)]/80 bg-[var(--surface-2)]/80 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_8px_24px_rgb(0_0_0/0.28)]'
      : 'border-[var(--border-1)] bg-[var(--surface-2)] shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_2px_8px_rgb(0_0_0/0.08)]');

  return (
    <nav
      ref={rowRef}
      aria-label="Primary"
      className={railClass}
      onPointerOver={onPointerOver}
      onPointerLeave={() => setHovered(null)}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1 bottom-1 rounded-full"
        style={{
          left: 0,
          width: `${indicator.width}px`,
          transform: `translate3d(${indicator.left}px, 0, 0)`,
          opacity: showIndicator ? 1 : 0,
          background: isGhost
            ? 'hsla(0, 0%, 100%, 0.05)'
            : 'hsla(0, 0%, 100%, 0.085)',
          boxShadow: isGhost
            ? 'none'
            : 'inset 0 1px 0 hsla(0, 0%, 100%, 0.08)',
          // Spring-ish "macOS snap" curve for `transform` + `width`
          // (fast start, slow settle). Colour + opacity get a shorter
          // linear-ish ramp so the active/ghost crossfade reads as
          // crisp, not laggy.
          transition: primed
            ? 'transform 520ms cubic-bezier(0.32, 0.72, 0, 1), width 520ms cubic-bezier(0.32, 0.72, 0, 1), opacity 220ms ease-out, background-color 220ms ease-out, box-shadow 220ms ease-out'
            : 'opacity 220ms ease-out',
          willChange: 'transform, width',
        }}
      />
      {children}
    </nav>
  );
}

// =============================================================================
// Satellite orb (language switch)
// =============================================================================

/**
 * The "moon" — a tiny circular companion to the main `NavPill`.
 * Pulled out of the pill so:
 *
 *   1. The pill stays purely about route navigation. The magic
 *      indicator can no longer be tugged by a hover pass over the
 *      language icon, because the language icon is no longer in
 *      the same surface as the route links.
 *   2. The two surfaces — long pill + small disc — sit beside each
 *      other with a deliberate gap, reading as a composed pair
 *      rather than a single overstuffed bar. The negative space
 *      between them does real composition work.
 *   3. The orb deliberately runs a touch smaller than the pill so
 *      the cluster has a clear "main subject + satellite" hierarchy;
 *      two identical-height boxes side by side would read as a
 *      split bar, not as a designed cluster.
 *
 * Material is intentionally identical to `NavPill` — same border,
 * same surface, same scroll-state crossfade — so the pair feels
 * like one piece of glass that happens to be in two shapes.
 */
function LangOrb({
  children,
  scrolled,
}: {
  children: ReactNode;
  scrolled: boolean;
}) {
  // Fixed 36×36 at every breakpoint — LangSwitcher is always
  // rendered in `compact` mode, so the orb is a constant-size
  // satellite next to the nav pill. The `.eikon-nav-glass` tag
  // routes the touch-viewport `backdrop-filter: none` override
  // in styles/index.css.
  const orbClass =
    'eikon-nav-glass relative isolate inline-flex h-9 w-9 items-center justify-center rounded-full border p-0.5 transition-[background-color,box-shadow,border-color] duration-300 ease-out ' +
    (scrolled
      ? 'border-[var(--border-2)]/80 bg-[var(--surface-2)]/80 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_8px_24px_rgb(0_0_0/0.28)]'
      : 'border-[var(--border-1)] bg-[var(--surface-2)] shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_2px_8px_rgb(0_0_0/0.08)]');

  return <div className={orbClass}>{children}</div>;
}

// =============================================================================
// Links
// =============================================================================

/**
 * Flat text link inside the pill. Visuals:
 *
 *   - Active : white @ 90% — bright enough to read as "I'm here"
 *              without shouting.
 *   - Idle   : white @ 42% — visibly secondary but readable at a
 *              glance.
 *   - Hover  : both states ramp to 90% on hover so the link
 *              telegraphs interactivity. Because the magic indicator
 *              also slides under the link on hover, the colour ramp
 *              and the indicator land together as a single beat.
 *
 * `data-nav-key` is what the rail's pointer-delegation reads to know
 * which link is hovered. Don't remove it.
 *
 * Click handling: plain left-clicks are intercepted and routed via
 * `navigate()`. Modifier-clicks fall through to the browser so
 * cmd/ctrl/middle-click still open in a new tab.
 *
 * Prefetch: the first hover OR focus on an idle link fires the route's
 * lazy chunk loader once (guarded by `prefetched.current`) — by the
 * time the user finishes aiming and clicks, the chunk is already
 * parsed and React can swap routes without showing a Suspense fallback.
 */
function NavLink({
  navKey,
  href,
  active,
  children,
}: {
  navKey: TrackedKey;
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  const prefetched = useRef(false);
  const prefetch = () => {
    if (prefetched.current) return;
    prefetched.current = true;
    void ROUTE_PREFETCH[navKey]();
  };

  const onClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!isPlainLeftClick(e)) return;
    e.preventDefault();
    navigate(href);
  };

  return (
    <a
      href={href}
      data-nav-key={navKey}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      onMouseEnter={prefetch}
      onFocus={prefetch}
      // `transition-[color,transform]` joins the colour ramp and the
      // press-feedback scale on the same compositor pass — `active:`
      // briefly dips the link to scale 0.94 while the mouse button
      // is held, giving the click a physical "tap" feel before the
      // route swap visually lands.
      className={
        'relative z-[1] inline-flex min-h-[36px] items-center justify-center rounded-full px-2 py-1.5 text-[12px] font-medium no-underline outline-none transition-[color,transform] duration-200 ease-out active:scale-[0.94] focus-visible:ring-2 focus-visible:ring-[hsla(0,0%,100%,0.45)] focus-visible:ring-offset-0 sm:px-3.5 sm:text-sm ' +
        (active
          ? 'text-[hsla(0,0%,100%,0.9)]'
          : 'text-[hsla(0,0%,100%,0.42)] hover:text-[hsla(0,0%,100%,0.9)]')
      }
    >
      {children}
    </a>
  );
}

/**
 * The "Playground" CTA — the only painted button in the nav. Stays
 * white-ceramic regardless of scroll-state so the eye always finds
 * it; the dark pill behind it just gets blurrier as the page scrolls.
 *
 * Visual stack:
 *   1. Top-to-bottom gradient (`white → off-white`) for a soft
 *      ceramic surface — flat white reads as a print swatch, not a
 *      surface.
 *   2. Inset top highlight + bottom shadow to lift the upper edge
 *      and ground the lower one.
 *   3. Outer drop shadow so the chip detaches from the dark pill.
 *   4. A play-triangle on the left, hinting at the interactive
 *      destination. The triangle scales on hover so the affordance
 *      feels alive even before the button itself nudges up.
 *
 * Hover state: the gradient brightens, the shadows deepen, the chip
 * lifts by 1px, the triangle scales by 1.1. Each of those is a cheap
 * compositor-only animation (`transform` + `box-shadow` + `background-
 * image`) so it's GPU-cheap and never repaints the rest of the nav.
 *
 * Active route: the user is already on `/playground`, so a click is
 * effectively a no-op for them. We still preventDefault the soft
 * navigate to avoid a redundant `pushState` (`navigate()` already
 * short-circuits identical URLs, but skipping the call is cheaper).
 *
 * `data-nav-key` is present but uses `playground`, which the rail's
 * pointer delegation deliberately ignores for indicator purposes —
 * the CTA carries its own visual selected state, we don't want the
 * indicator to fly over it.
 */
function PlaygroundCta({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  const prefetched = useRef(false);
  const prefetch = () => {
    if (prefetched.current) return;
    prefetched.current = true;
    void ROUTE_PREFETCH.playground();
  };

  const onClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!isPlainLeftClick(e)) return;
    e.preventDefault();
    if (active) return;
    navigate(PLAYGROUND_PATH);
  };

  return (
    <a
      href={PLAYGROUND_PATH}
      data-nav-key="playground"
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      onMouseEnter={prefetch}
      onFocus={prefetch}
      // `active:translate-y-0 active:scale-[0.96]` overrides the
      // hover lift on press, so the CTA *visibly* recoils into the
      // surface when clicked — feels like a physical button rather
      // than a div changing class.
      className="group relative z-[1] ml-0.5 inline-flex min-h-[36px] items-center gap-1 rounded-full bg-gradient-to-b from-white to-zinc-200 px-2 py-1.5 text-[12px] font-medium text-zinc-900 no-underline shadow-[inset_0_1px_0_rgb(255_255_255/0.9),inset_0_-1px_0_rgb(0_0_0/0.08),0_1px_2px_rgb(0_0_0/0.25),0_4px_10px_rgb(0_0_0/0.15)] transition-[transform,box-shadow,background] duration-200 ease-out hover:-translate-y-px hover:from-white hover:to-zinc-100 hover:shadow-[inset_0_1px_0_rgb(255_255_255/1),inset_0_-1px_0_rgb(0_0_0/0.08),0_2px_4px_rgb(0_0_0/0.25),0_6px_14px_rgb(0_0_0/0.2)] active:translate-y-0 active:scale-[0.96] sm:ml-1 sm:gap-1.5 sm:px-3.5 sm:text-sm"
    >
      <PlayIcon className="h-3 w-3 fill-zinc-900 text-zinc-900 transition-transform duration-200 ease-out group-hover:scale-110" />
      <span>{label}</span>
    </a>
  );
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

// =============================================================================
// Type re-export — `AppRoute` lives in `./route` but a few callers
// may want it without depending on the router module directly.
// =============================================================================

export type { AppRoute };
