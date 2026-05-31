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
      <div className="grid gap-8 @2xl/examples:grid-cols-[220px_minmax(0,1fr)] @2xl/examples:items-start">
        {/*
          Sticky (NOT fixed): the sidebar scrolls with the page normally,
          then pins once the page scrolls far enough that its top would
          leave the viewport. `top-4` hugs the viewport top — the app
          topbar in this shell scrolls away rather than docking, so we
          don't leave a topbar-sized gap above the panel.

          `items-start` on the grid + `self-start` on the aside stop the
          grid row from stretching the aside to match `<main>`'s height
          (which would give `sticky` zero travel and silently break it on
          long pages). The inner panel is capped to the viewport and
          scrolls internally, so a long nav never forces the *page* to
          scroll and drag the sidebar along with it. Narrow shells keep
          the natural stacked flow.
        */}
        {/*
          Layout-aware sticky offset. Each root layout declares its fixed
          chrome via CSS vars on its outermost element:

            - `--app-topbar-h`     height of any sticky/fixed top bar
            - `--app-bottombar-h`  height of any fixed bottom bar (tabs)

          Both default to `0px` (the `var(--app-…, 0px)` fallback). That
          way the same examples shell behaves correctly regardless of
          which layout hosts it:

            - Stacked (static topbar that scrolls away): both 0 — sidebar
              hugs the viewport top once the user scrolls past the topbar.
            - Mobile / Topbar+Sidebar / Bottom-tabs (sticky h-14): the
              sidebar parks BELOW the sticky topbar instead of underneath.
            - Bottom-tabs (fixed h-16 bottom): the sidebar's max-height
              shrinks so it doesn't extend under the bottom bar.
        */}
        <aside
          aria-label={t('toc.label')}
          className={[
            'self-start',
            '@2xl/examples:sticky',
            '@2xl/examples:top-[calc(var(--app-topbar-h,0px)+1rem)]',
          ].join(' ')}
        >
          {/*
            Documentation-style nav: NO surrounding card (border/shadow/bg)
            on wide shells — that "framed panel" look makes the nav read
            like a dialog. We just cap its height and let it scroll, with
            a single right-edge divider to mark the column. On narrow
            shells the surrounding chrome is unnecessary anyway, since the
            list is shown by an explicit disclosure toggle.
          */}
          <div
            className={[
              '@2xl/examples:overflow-y-auto',
              '@2xl/examples:pr-3',
              '@2xl/examples:border-r',
              '@2xl/examples:border-[var(--color-border)]',
              '@2xl/examples:max-h-[calc(100dvh-var(--app-topbar-h,0px)-var(--app-bottombar-h,0px)-2rem)]',
            ].join(' ')}
          >
            <ExamplesSidebar />
          </div>
        </aside>

        {/*
          Inner Suspense so navigating between sub-pages only swaps the
          content column — the sidebar stays put instead of the whole
          shell flashing the app-level RouteFallback on each route change.
        */}
        <main className="flex min-w-0 flex-col">
          {/*
            Dev-only notice, rendered ONCE for the whole shell. Lives at
            the top of the CONTENT column (not above the grid) so it adds
            NO height above the sidebar — that's what keeps the pinned
            panel flush with the top of the column rather than offset by a
            badge-shaped gap.
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
