/**
 * @file LandingPage.tsx
 * @description Top-level composition for the preview-site landing.
 *
 * Home route visual order (top → bottom):
 *
 *   1.  Nav               — sticky, with lang + Playground CTA.
 *   2.  Hero              — slogan + CTA.
 *   3.  PlatformPicker    — rich Web/Desktop/Mobile cards with
 *                           bullets + 3D tilt. Doubles as both the
 *                           primary choice axis AND the "what does
 *                           this template ship?" overview (formerly a
 *                           separate Outputs section).
 *   4.  PlaygroundSection — params card + 3-pane workspace.
 *   5.  PromptOutput      — copy-ready Prompt / CLI block.
 *   6.  TechStackWall     — marquee + tiered logo grid.
 *   7.  PainPoints        — 4-up "problem → solution" cards.
 *   8.  Philosophy        — author's tech-stack opinions.
 *   9.  QASection         — accordion FAQ + author-email CTA.
 *   10. Footer            — author / contact.
 *
 * The page is intentionally split into a "tool half" (sections 2-5)
 * and a "story half" (sections 6-9), separated by a thin divider.
 * Users who already trust the project see the tool first; users who
 * need convincing keep scrolling.
 *
 * Routing: three known top-level paths (`/`, `/playground`, `/changelog`)
 * are dispatched by a tiny path-checking shim. We avoid a real router
 * dependency because the page set is closed and the navigations are
 * coarse-grained — every route boundary is a hard navigation through
 * the browser's `<a href>` mechanism (which lets the params store
 * re-hydrate from URL + localStorage on each entry).
 */

import {
  lazy,
  Suspense,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';

import { Nav } from './nav/Nav';
import { useAppRoute, type AppRoute } from './nav/route';
import { loadChangelog, loadPlayground } from './nav/route-loaders';
import { Footer } from './sections/Footer';
import { Hero } from './sections/Hero';
import { PainPoints } from './sections/PainPoints';
import { Philosophy } from './sections/Philosophy';
import {
  PlatformPicker,
  PLATFORM_PICKER_ANCHOR_ID,
} from './sections/PlatformPicker';
import { PlaygroundSection } from './sections/PlaygroundSection';
import { PromptOutput, PROMPT_OUTPUT_ANCHOR_ID } from './sections/PromptOutput';
import { QASection } from './sections/QASection';
import { TechStackWall } from './sections/TechStackWall';
import { ThemeAndLangSync } from './theme/theme-store';

// Both /playground and /changelog are heavy routes (CodeMirror, react-
// arborist, the markdown notes block). Lazy-loading keeps the cold JS
// for the marketing home small — visitors who never click through to
// these tools don't pay for the extra code.
//
// Loader fns live in `./nav/route-loaders.ts` so the Nav can re-use
// the same identity for hover-time prefetch (see `ROUTE_PREFETCH`
// over there). Sharing the loader function reference is what
// guarantees the hover `import()` and the click-time `React.lazy`
// hit the same chunk promise — the second resolves from cache.
const PlaygroundPage = lazy(loadPlayground);
const ChangelogPage = lazy(loadChangelog);

export default function LandingPage() {
  // `route` is the *intent* — updates synchronously on link click, so
  // the Nav can flip its active highlight + magic-pill indicator in
  // the same frame. The user immediately sees their click landing.
  //
  // `committedRoute` is the *commit* — kept one step behind via
  // `useDeferredValue` so React can hold the old subtree mounted
  // while the new route's lazy chunk loads. This is what kills the
  // Suspense-fallback flicker: instead of "old page disappears →
  // Loading spinner → new page", the user sees "click → old page
  // stays + LoadingBar crawls → new page cross-fades in".
  //
  // `isRoutePending` is the gap between intent and commit: the
  // LoadingBar uses it to nprogress its way across the top of the
  // viewport.
  //
  // Scroll-snap-to-top is intentionally NOT handled here. The
  // RouteCrossFader does it the instant the cross-fade starts so
  // both layers (outgoing + incoming) fade from the same vertical
  // origin — if we scrolled here instead, the outgoing layer
  // would still be at the user's previous scroll position while
  // the new one entered from top, which looks broken.
  const route = useAppRoute();
  const committedRoute = useDeferredValue(route);
  const isRoutePending = route !== committedRoute;

  return (
    <>
      <ThemeAndLangSync />
      <Nav route={route} pending={isRoutePending} />
      <RouteCrossFader route={committedRoute} />
    </>
  );
}

/** A live slot tracked by the cross-fader. */
type RouteSlot = { id: number; route: AppRoute };

/**
 * Two-layer route container that cross-fades between SPA routes.
 *
 * Why two layers, not one
 * -----------------------
 * The previous one-layer implementation re-keyed a single wrapper
 * by route name. React tore down the old subtree the *instant* the
 * key changed and only then ran the enter animation on the new
 * one — visually this is a hard cut followed by a renaissance, not
 * a transition. Users described it as "loading is not smooth and
 * not connected".
 *
 * The fix is to stop unmounting the previous subtree on click and
 * instead keep it on screen for the duration of its own *exit*
 * animation. We do that by maintaining two render slots:
 *
 *   - `current`  : the live route (normal flow, `eikon-route-enter`).
 *   - `outgoing` : the previously-live route, demoted into an
 *                  absolutely-positioned overlay (`z-10`, `inert`,
 *                  `pointer-events-none`) that runs the exit
 *                  animation and unmounts itself on `animationend`.
 *
 * The exit (320ms) and enter (480ms) curves overlap by 320ms — for
 * the entire dissolve window both layers are visible at intermediate
 * alpha. That's what turns "page A vanished, page B appeared" into
 * "page A dissolved into page B".
 *
 * Behaviour notes
 * ---------------
 *   - Scroll snap fires at the *start* of the cross-fade, before
 *     either layer animates, so both fade from the same vertical
 *     origin. Otherwise the outgoing layer would fade out from the
 *     user's previous scroll position.
 *
 *   - Rapid-fire navigation (A → B → C mid-fade) is safe: the
 *     useEffect simply replaces any in-flight outgoing slot with
 *     the *new* outgoing (formerly the in-flight current). The
 *     previous outgoing is unmounted immediately, which is the
 *     correct behaviour — we don't queue dissolves, we always
 *     reflect the latest state.
 *
 *   - `prefers-reduced-motion`: we skip the cross-fade entirely
 *     and do a single-layer swap. The CSS keyframes are already
 *     no-op'd, but the JS guard avoids paying the double-render
 *     cost on every navigation for those users.
 *
 *   - A11y: the incoming wrapper is `tabIndex={-1}` and gets
 *     `focus({ preventScroll: true })` on each switch (skipping
 *     the very first mount) so keyboard and screen-reader users
 *     get teleported into the new page in lockstep with the
 *     visual scroll snap. The outgoing layer carries `inert` so
 *     stray focus / pointer events on the dissolving page are
 *     swallowed.
 */
function RouteCrossFader({ route }: { route: AppRoute }) {
  const [current, setCurrent] = useState<RouteSlot>(() => ({
    id: 0,
    route,
  }));
  const [outgoing, setOutgoing] = useState<RouteSlot | null>(null);
  // Monotonic id source — guarantees React tears down + re-mounts
  // the wrapper on each transition (so the enter animation runs
  // every time, even if the route name is reused after a quick
  // round-trip like A → B → A).
  const nextIdRef = useRef(0);

  const enterRef = useRef<HTMLDivElement | null>(null);
  const skipInitialFocus = useRef(true);

  useEffect(() => {
    if (route === current.route) return;

    const reduced = prefersReducedMotion();

    // Always scroll-snap first. Both layers will then fade from
    // (0, 0), which is the only origin that reads as "the page
    // changed", rather than "the page changed AND moved".
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    if (reduced) {
      // Single-layer swap for users who opted out of motion. The
      // outgoing slot is cleared in case a previous transition left
      // one behind (rare but possible if the user re-enabled motion
      // mid-session — defensive cleanup).
      setOutgoing(null);
      nextIdRef.current += 1;
      setCurrent({ id: nextIdRef.current, route });
      return;
    }

    // Cross-fade swap: demote `current` to `outgoing`, mount a fresh
    // `current` slot for the new route. If a prior outgoing was
    // still mid-fade, React will unmount it (its `animationend`
    // listener never fires, but the DOM node is gone so there's
    // nothing to clean up — no leak).
    setOutgoing(current);
    nextIdRef.current += 1;
    setCurrent({ id: nextIdRef.current, route });
  }, [route, current]);

  // Move keyboard focus into the freshly-mounted incoming wrapper on
  // each switch. Skip the very first mount — we don't want to snatch
  // focus from the URL bar / autofocused form fields on initial load.
  useEffect(() => {
    if (skipInitialFocus.current) {
      skipInitialFocus.current = false;
      return;
    }
    enterRef.current?.focus({ preventScroll: true });
  }, [current.id]);

  return (
    <div className="relative isolate">
      {outgoing && (
        <div
          key={`out-${outgoing.id}`}
          aria-hidden="true"
          // `inert` swallows pointer + focus on the dissolving layer
          // so the user can't accidentally interact with the page
          // they just left. React 19 accepts boolean inert.
          inert
          className="eikon-route-leave pointer-events-none absolute inset-x-0 top-0 z-10"
          onAnimationEnd={() => setOutgoing(null)}
        >
          {renderRouteBody(outgoing.route)}
        </div>
      )}
      <div
        key={`in-${current.id}`}
        ref={enterRef as Ref<HTMLDivElement>}
        tabIndex={-1}
        className="eikon-route-enter outline-none"
      >
        {renderRouteBody(current.route)}
      </div>
    </div>
  );
}

/**
 * Render the body of a route. Each non-home route is its own
 * Suspense boundary so the lazy chunk's loading state never
 * cascades up past the cross-fader (which would defeat the whole
 * point of holding the outgoing layer on screen).
 */
function renderRouteBody(route: AppRoute): ReactNode {
  if (route === 'home') return <HomeRoute />;
  return (
    <Suspense fallback={<PageFallback />}>
      {route === 'changelog' && <ChangelogPage />}
      {route === 'playground' && <PlaygroundPage />}
    </Suspense>
  );
}

/**
 * Lightweight `prefers-reduced-motion` probe. Returns false in SSR
 * and in environments without `matchMedia` (older happy-dom shims,
 * niche embedded webviews) so we never crash on the check; we just
 * fall back to "motion allowed" rather than over-restricting.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function PageFallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center text-sm text-[var(--fg-3)]">
      <span
        aria-hidden="true"
        className="mr-2 inline-block h-3 w-3 rounded-full border-2 border-[var(--border-2)] border-t-[var(--fg-1)]"
        style={{ animation: 'eikon-preview-spin 0.8s linear infinite' }}
      />
      Loading…
    </div>
  );
}

function HomeRoute() {
  // Smooth-scroll the platform picker into view when the Hero CTA fires.
  // We use the DOM directly rather than a ref because the picker isn't
  // a child of Hero — passing a ref through would couple two unrelated
  // sections. The same trick is reused for the "find it" pill that
  // jumps to the PromptOutput section (the real prompt sits there, the
  // hero's terminal card is just a teaser).
  function scrollToId(id: string): void {
    const el =
      typeof document !== 'undefined' ? document.getElementById(id) : null;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main>
      <Hero
        onPrimaryCta={() => scrollToId(PLATFORM_PICKER_ANCHOR_ID)}
        onFindIt={() => scrollToId(PROMPT_OUTPUT_ANCHOR_ID)}
      />
      <PlatformPicker />
      <PlaygroundSection />
      <PromptOutput />
      <SectionDivider />
      <TechStackWall />
      <PainPoints />
      <Philosophy />
      <QASection />
      <Footer />
    </main>
  );
}

/**
 * Thin horizontal rule used to break the rhythm between the "tool"
 * half of the page (Playground + Prompt) and the "story" half
 * (Stack / Pain / Philosophy / FAQ). Without it, the long scroll
 * reads as one undifferentiated mass.
 */
function SectionDivider() {
  return (
    <div className="mx-auto my-12 max-w-7xl px-6 sm:my-16">
      <div
        className="h-px w-full"
        style={{
          background:
            'linear-gradient(to right, transparent, var(--border-1), transparent)',
        }}
      />
    </div>
  );
}

