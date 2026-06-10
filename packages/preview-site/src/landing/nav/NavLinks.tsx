import {
  useRef,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';

import { navigate } from './route';
import { ROUTE_PREFETCH } from './route-loaders';

import type { TrackedKey } from './NavPill';

export const HOME_PATH = '/';
export const CHANGELOG_PATH = '/changelog';
const PLAYGROUND_PATH = '/playground';

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
export function LangOrb({
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
export function NavLink({
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
export function PlaygroundCta({
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
