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
 *
 * Shell-level keyboard shortcuts:
 *   - `[` and `]` step through the flat registry order (prev / next
 *     section); skipped when the visitor is typing in a form control,
 *     so the bracket characters in form inputs work normally.
 *   - `/` is handled inside `ExamplesSidebar` (focuses the filter).
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { Suspense, useEffect } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

// --- Third-party Libraries ---
import { Sparkles } from 'lucide-react';

// --- Absolute Imports ---
import { Spinner } from '@/shared/ui/spinner';

// --- Relative Imports ---
import { ExamplesSidebar } from '../components/ExamplesSidebar';
import { getNeighbours } from '../components/sectionMeta';

// =================================================================================================
// Component
// =================================================================================================

function ExamplesLayout() {
  const { t } = useTranslation('examples');
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // `[` / `]` step through the flat order. We resolve neighbours from
  // the current path's last segment so it works for the `:section`
  // route AND the standalone showcase routes (they all share the same
  // flat registry). Skip when the visitor is typing — bracket keys in
  // a `<textarea>` or a code editor must stay literal.
  useEffect(() => {
    function isTypingInForm(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== '[' && e.key !== ']') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingInForm(e.target)) return;
      const slug = pathname.split('/').filter(Boolean).at(-1);
      if (!slug || slug === 'examples') return;
      const { prev, next } = getNeighbours(slug);
      const target = e.key === '[' ? prev : next;
      if (target) {
        e.preventDefault();
        navigate(`/examples/${target.slug}`);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pathname, navigate]);

  return (
    <div className="@container/examples">
      <div className="grid gap-8 @2xl/examples:grid-cols-[220px_minmax(0,1fr)] @2xl/examples:items-start">
        {/*
          Sticky (NOT fixed): the sidebar scrolls with the page normally,
          then pins once the page scrolls far enough that its top would
          leave the viewport.

          `items-start` on the grid + `self-start` on the aside stop the
          grid row from stretching the aside to match `<main>`'s height
          (which would give `sticky` zero travel and silently break it on
          long pages). The inner panel is capped to the viewport and
          scrolls internally, so a long nav never forces the *page* to
          scroll and drag the sidebar along with it. Narrow shells keep
          the natural stacked flow.

          Layout-aware sticky offset. Each root layout declares its
          fixed chrome via CSS vars on its outermost element:
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
            Slim utility row at the very top of the content column —
            renders ONCE for the whole shell. Lives at the top of the
            content column (not above the grid) so it adds NO height
            above the sidebar; that's what keeps the pinned panel flush
            with the top of the column rather than offset by a
            badge-shaped gap. Smaller now than the original loud banner
            so it doesn't compete with the page's own H1.
          */}
          <div className="mb-6 flex items-center gap-2 text-[11px] text-[var(--color-muted-foreground)]">
            <span
              role="status"
              className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300"
            >
              <Sparkles aria-hidden="true" className="h-3 w-3 shrink-0" />
              <span className="font-medium uppercase tracking-[0.08em]">
                {t('meta.devOnlyBadge')}
              </span>
            </span>
            <span className="hidden truncate sm:inline">
              {t('meta.devOnlyNotice')}
            </span>
          </div>

          {/*
            Cap reading width on ultra-wide shells (sidebar-only / topbar-
            sidebar can give us 1500+ px). Doesn't fight narrower shells
            because `w-full` keeps it filling whatever's available, and
            the `@2xl` cap kicks in only when the host gives us room.
          */}
          <div className="w-full max-w-5xl">
            <Suspense
              fallback={
                <div className="flex min-h-40 items-center justify-center text-[var(--color-muted-foreground)]">
                  <Spinner size="lg" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { ExamplesLayout };
