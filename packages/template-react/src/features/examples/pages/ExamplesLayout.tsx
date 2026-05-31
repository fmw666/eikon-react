/**
 * @file ExamplesLayout.tsx
 * @description Shell route for `/examples` — a persistent categorised
 * sidebar on the LEFT plus an `<Outlet/>` for the active sub-page.
 *
 * Clicking a sidebar item NAVIGATES to that component's own route (e.g.
 * `/examples/button`) rather than scroll-spying anchors on one long page,
 * so each component gets a focused, independently-addressable sub-page.
 *
 * The two-column split is gated by a CSS *container query* (`@2xl` on the
 * named `examples` container) rather than a viewport media query, so the
 * shell degrades gracefully no matter what layout variant hosts it:
 *   - Wide shells: sidebar docks left + sticky, content fills the rest.
 *   - Narrow shells (e.g. CenteredRootLayout's ~448px card): single
 *     column with the sidebar stacked above the content.
 *
 * `min-w-0` on `<main>` re-enables grid-item shrink so a wide demo (e.g.
 * the button matrix or a table) can't blow out the content column.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { Suspense } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

// --- Third-party Libraries ---
import { Sparkles } from 'lucide-react';

// --- Absolute Imports ---
import { Spinner } from '@/shared/ui/spinner';

// --- Relative Imports ---
import { ExamplesSidebar } from '../components/ExamplesSidebar';

// =================================================================================================
// Component
// =================================================================================================

function ExamplesLayout() {
  const { t } = useTranslation('examples');

  return (
    <div className="@container/examples">
      {/*
        Dev-only notice, rendered ONCE for the whole shell (it used to
        repeat as a loud banner on every sub-page). Slim pill so it reads
        as persistent chrome rather than a per-page alert.
      */}
      <div
        role="status"
        className="mb-6 flex w-fit items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-700 dark:text-amber-300"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium uppercase tracking-wide">
          {t('meta.devOnlyBadge')}
        </span>
        <span className="hidden text-amber-700/80 sm:inline dark:text-amber-300/80">
          · {t('meta.devOnlyNotice')}
        </span>
      </div>

      <div className="grid gap-8 @2xl/examples:grid-cols-[220px_minmax(0,1fr)]">
        <aside
          aria-label={t('toc.label')}
          className="self-start @2xl/examples:sticky @2xl/examples:top-20"
        >
          {/*
            On wide shells the sidebar sticks below the topbar (top-20 =
            5rem). Without a bounded height it can't scroll on its own —
            `sticky` only pins it, so a nav taller than the viewport spills
            into page scroll and clips. Capping the height to the
            remaining viewport (minus the 5rem offset + breathing room)
            and adding `overflow-y-auto` turns it into an independent
            scroll region. Narrow shells keep the natural stacked flow.
          */}
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm @2xl/examples:max-h-[calc(100dvh-7rem)] @2xl/examples:overflow-y-auto">
            <ExamplesSidebar />
          </div>
        </aside>

        {/*
          Inner Suspense so navigating between sub-pages only swaps the
          content column — the sidebar stays put instead of the whole
          shell flashing the app-level RouteFallback on each route change.
        */}
        <main className="flex min-w-0 flex-col">
          <Suspense
            fallback={
              <div className="flex min-h-40 items-center justify-center text-[var(--color-muted-foreground)]">
                <Spinner size="lg" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { ExamplesLayout };
