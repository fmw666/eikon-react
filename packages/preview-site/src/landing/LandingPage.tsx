/**
 * @file LandingPage.tsx
 * @description Top-level composition for the preview-site landing.
 *
 * Home route visual order (top → bottom):
 *
 *   1. Nav               — sticky, with lang + Playground CTA.
 *   2. Hero              — slogan + CTA.
 *   3. PlatformPicker    — rich Web/Desktop/Mobile cards with
 *                          bullets + 3D tilt. Doubles as both the
 *                          primary choice axis AND the "what does
 *                          this template ship?" overview (formerly a
 *                          separate Outputs section).
 *   4. PlaygroundSection — the workbench: params + copyable prompt
 *                          on a left sidebar, the live three-pane
 *                          shell (Files / Code / Preview) on the
 *                          right. The complete "configure → preview
 *                          → copy" loop happens inside this single
 *                          card so the visitor's eye never has to
 *                          leave the focal surface to see how their
 *                          choices flow into the final command.
 *   5. TechStackWall     — marquee + tiered logo grid.
 *   6. PainPoints        — 4-up "problem → solution" cards.
 *   7. AgentToil         — the cost beat: a looping agent-chat mock
 *                          (runs 1h+, user keeps typing «请继续») beside
 *                          the author's direct appeal.
 *   8. Philosophy        — author's tech-stack opinions.
 *   9. QASection         — accordion FAQ + author-email CTA.
 *  10. Footer            — author / contact.
 *
 * The page is intentionally split into a "tool half" (sections 2-4)
 * and a "story half" (sections 5-8), separated by a thin divider.
 * Users who already trust the project see the tool first; users who
 * need convincing keep scrolling. The PromptOutput surface used to
 * live as its own section between the playground and the divider;
 * it now sits inside the workbench's sidebar (see PlaygroundSection)
 * so the visitor doesn't have to scroll between three loosely-tied
 * surfaces to see the result of a single configuration toggle.
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
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';

import { Reveal } from './components/Reveal';
import { Nav } from './nav/Nav';
import {
  supportsViewTransitions,
  useAppRoute,
  usePopstateViewTransition,
  type AppRoute,
} from './nav/route';
import { loadChangelog, loadPlayground } from './nav/route-loaders';
import { AgentToil } from './sections/AgentToil';
import { Footer } from './sections/footer';
import { Hero } from './sections/Hero';
import { PainPoints } from './sections/PainPoints';
import { Philosophy } from './sections/Philosophy';
import {
  PlatformPicker,
  PLATFORM_PICKER_ANCHOR_ID,
} from './sections/platform-picker';
import { PlaygroundSection } from './sections/PlaygroundSection';
import { QASection } from './sections/QASection';
import { TechStackWall } from './sections/TechStackWall';
import { ThemeAndLangSync } from './theme/theme-store';

const PlaygroundPage = lazy(loadPlayground);
const ChangelogPage = lazy(loadChangelog);

export default function LandingPage() {
  const route = useAppRoute();
  const committedRoute = useDeferredValue(route);
  const isRoutePending = route !== committedRoute;

  // Wire popstate → View Transitions so back/forward also animate.
  usePopstateViewTransition();

  return (
    <>
      <ThemeAndLangSync />
      <Nav route={route} pending={isRoutePending} />
      {supportsViewTransitions ? (
        // VT path: use `route` directly — the browser holds the old page
        // as a raster screenshot while React renders the new content.
        // Using `committedRoute` (deferred) here would make the VT capture
        // stale content as the "new state", then React pops the real
        // content in later without animation.
        <ViewTransitionRouter route={route} />
      ) : (
        <RouteCrossFader route={committedRoute} />
      )}
    </>
  );
}

/**
 * Single-slot router for browsers with View Transitions API.
 * The browser snapshot handles exit animation — we only render
 * the incoming page. Scroll-snap happens in the VT callback.
 */
function ViewTransitionRouter({ route }: { route: AppRoute }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const prevRoute = useRef(route);

  useEffect(() => {
    if (route === prevRoute.current) return;
    prevRoute.current = route;
    wrapperRef.current?.focus({ preventScroll: true });
  }, [route]);

  return (
    <div
      ref={wrapperRef}
      tabIndex={-1}
      className="outline-none"
    >
      {renderRouteBody(route)}
    </div>
  );
}

/** A live slot tracked by the cross-fader. */
type RouteSlot = { id: number; route: AppRoute };

/**
 * Fallback two-layer cross-fader for browsers without View Transitions.
 * When the API is available, `ViewTransitionRouter` above is used instead.
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

    if (reduced) {
      setOutgoing(null);
      nextIdRef.current += 1;
      setCurrent({ id: nextIdRef.current, route });
      return;
    }

    // Cross-fade swap: demote `current` to `outgoing`, mount a fresh
    // `current` slot for the new route.
    setOutgoing(current);
    nextIdRef.current += 1;
    setCurrent({ id: nextIdRef.current, route });
  }, [route, current]);

  // Scroll to top before paint once the outgoing layer covers viewport.
  // The absolute-positioned outgoing layer hides the scroll jump.
  useLayoutEffect(() => {
    if (outgoing) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [outgoing]);

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
  return <div className="h-[60dvh]" />;
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

  // Section-level scroll reveals. Each <Reveal> wraps a single
  // section and lifts it into place when its top edge crosses
  // ~12% of the viewport. Three deliberate notes about the rhythm:
  //
  //   1. The Hero is NOT wrapped. It's already covered by the
  //      route-level `eikon-route-enter` curve that animates the
  //      whole page in on first paint — adding a second curve on
  //      top would double up the entrance and make the home feel
  //      jittery rather than "wow".
  //
  //   2. Big card / grid sections (PlatformPicker, PainPoints)
  //      use the more aggressive `rise-scale` variant so the
  //      surfaces feel like physical objects arriving on stage,
  //      not just text drifting up. Typography-led sections keep
  //      the calmer `rise` default.
  //
  //   3. The divider has its own tiny reveal so the page never
  //      shows the divider line "ahead of" the section it's
  //      dividing — keeps the rhythm consistent on slow scrolls.
  return (
    <main className="eikon-landing">
      <Hero onPrimaryCta={() => scrollToId(PLATFORM_PICKER_ANCHOR_ID)} />
      <Reveal variant="rise-scale">
        <PlatformPicker />
      </Reveal>
      <Reveal>
        <PlaygroundSection />
      </Reveal>
      <Reveal variant="zoom">
        <SectionDivider />
      </Reveal>
      <Reveal>
        <TechStackWall />
      </Reveal>
      <Reveal variant="zoom">
        <QuoteStrip />
      </Reveal>
      <Reveal variant="rise-scale">
        <PainPoints />
      </Reveal>
      {/* A divider caps the dense PainPoints grid before the AgentToil band.
          AgentToil is a full-bleed tinted band and is intentionally NOT
          wrapped in <Reveal>: a scale-in transform would pull the band in
          from the viewport edges. It reveals its own (centred) content. */}
      <Reveal variant="zoom">
        <SectionDivider />
      </Reveal>
      <AgentToil />
      <Reveal>
        <Philosophy />
      </Reveal>
      <Reveal>
        <QASection />
      </Reveal>
      <Reveal>
        <Footer />
      </Reveal>
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
    <div className="mx-auto my-12 max-w-7xl px-4 sm:my-16 sm:px-6">
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

function QuoteStrip() {
  return (
    <div className="mx-auto my-8 max-w-4xl px-4 py-12 text-center sm:my-12 sm:py-16">
      <blockquote className="text-xl font-medium italic leading-relaxed tracking-tight sm:text-2xl lg:text-3xl">
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage:
              'linear-gradient(90deg, var(--fg-3) 0%, var(--fg-1) 20%, var(--fg-3) 40%, var(--fg-3) 100%)',
            backgroundSize: '250% 100%',
            animation: 'eikon-text-shimmer 10s infinite',
          }}
        >
          &ldquo;The best AI scaffolding is the one you never have to explain&#8201;
        </span><span className="not-italic text-[var(--fg-3)]">&rdquo;</span>
      </blockquote>
      <div
        className="mx-auto mt-6 h-px w-16"
        style={{
          background:
            'linear-gradient(to right, transparent, var(--border-2), transparent)',
        }}
      />
    </div>
  );
}

