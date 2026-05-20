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

import { lazy, Suspense, useEffect, useState } from 'react';

import { Nav } from './nav/Nav';
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
const PlaygroundPage = lazy(() => import('./PlaygroundPage'));
const ChangelogPage = lazy(() => import('./changelog/ChangelogPage'));

type Route = 'home' | 'changelog' | 'playground';

/**
 * Lightweight router shim — maps `window.location.pathname` to one of
 * three known routes. Re-checks on `popstate` so the browser
 * Back/Forward buttons feel native even without a router.
 *
 * Routes:
 *   /            → home
 *   /playground  → playground (full-screen tool view)
 *   /changelog…  → changelog (GitHub-release diff viewer)
 */
function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => resolveRoute());
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => setRoute(resolveRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return route;
}

function resolveRoute(): Route {
  if (typeof window === 'undefined') return 'home';
  const p = window.location.pathname;
  if (p.startsWith('/changelog')) return 'changelog';
  if (p.startsWith('/playground')) return 'playground';
  return 'home';
}

export default function LandingPage() {
  const route = useRoute();
  return (
    <>
      <ThemeAndLangSync />
      <Nav />
      {route === 'changelog' && (
        <Suspense fallback={<PageFallback />}>
          <ChangelogPage />
        </Suspense>
      )}
      {route === 'home' && <HomeRoute />}
      {route === 'playground' && (
        <Suspense fallback={<PageFallback />}>
          <PlaygroundPage />
        </Suspense>
      )}
    </>
  );
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

