/**
 * @file RootLayout.tsx
 * @description Top-level layout for every route in the app.
 *
 * Owns the header / navigation, the shared <Suspense> boundary for
 * lazy-loaded routes, and the footer. Variant-aware: an
 * `@eikon:variant(layout=*)` block at the top of the file collapses
 * to exactly one of stacked / sidebar / topbar at CLI strip time.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { Suspense } from 'react';

// --- Core-related Libraries ---
// @eikon:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @eikon:feature(i18n) end
import { Link, NavLink, Outlet } from 'react-router-dom';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';
// @eikon:feature(i18n) begin
import { LanguageSwitcher } from '@/shared/ui/language-switcher';
// @eikon:feature(i18n) end
import { ThemeToggle } from '@/shared/ui/theme-toggle';

// =================================================================================================
// Types
// =================================================================================================

interface NavLinkSpec {
  to: string;
  /** i18n key for the label. Falls back to literal English when i18n is stripped. */
  key: string;
  fallback: string;
  end?: boolean;
}

// =================================================================================================
// Constants
// =================================================================================================

const navLinks: NavLinkSpec[] = [
  { to: '/', key: 'nav.home', fallback: 'Home', end: true },
  { to: '/counter', key: 'nav.counter', fallback: 'Counter' },
  { to: '/tasks', key: 'nav.tasks', fallback: 'Tasks' },
];

/**
 * Layout-axis variant marker.
 *
 * strip-features collapses the array literal below down to exactly one entry
 * (the chosen variant). In the unstripped template all three entries coexist
 * and `.at(0)` returns the first ("stacked"), so the dev experience matches
 * the schema default.
 *
 * The resulting class is attached to the root <div> so CSS rules in
 * src/styles/index.css can tailor the look per variant without restructuring
 * the JSX.
 */
const LAYOUT_VARIANT_CLASS =
  [
    // @eikon:variant(layout=stacked) begin
    'layout-stacked',
    // @eikon:variant(layout=stacked) end
    // @eikon:variant(layout=sidebar) begin
    'layout-sidebar',
    // @eikon:variant(layout=sidebar) end
    // @eikon:variant(layout=topbar) begin
    'layout-topbar',
    // @eikon:variant(layout=topbar) end
  ].at(0) ?? 'layout-stacked';

// =================================================================================================
// Component
// =================================================================================================

function RootLayout() {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation();
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (_k: string, opts?: { defaultValue?: string }) =>
  //   opts?.defaultValue ?? _k;
  // @eikon:feature(i18n:fallback) end

  return (
    <div className={cn('flex min-h-screen flex-col', LAYOUT_VARIANT_CLASS)}>
      <header className="border-b border-[var(--color-border)] bg-[var(--color-card)]/70 backdrop-blur">
        {/*
          3-column grid pattern: brand (left, 1fr) | nav (auto, centered) |
          actions (right, 1fr). The matching 1fr columns on either side force
          the auto-sized <nav> into the exact horizontal centre of the header,
          independent of how long the brand or actions get. Drop additional
          icon buttons (notifications, avatar, settings, ...) into the right
          cell — the nav stays centred without any extra math.
        */}
        <div className="mx-auto grid h-14 max-w-5xl grid-cols-[1fr_auto_1fr] items-center px-4">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            Eikon App
          </Link>
          <nav className="flex items-center justify-self-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm transition-colors',
                    'text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]',
                    isActive &&
                      'bg-[var(--color-accent)] text-[var(--color-accent-foreground)]'
                  )
                }
              >
                {t(link.key, { defaultValue: link.fallback })}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center justify-self-end gap-1">
            {/* @eikon:feature(i18n) begin */}
            <LanguageSwitcher />
            {/* @eikon:feature(i18n) end */}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {/*
          Shared Suspense boundary for every lazy-loaded page in the app.
          Keep the fallback intentionally lightweight — it appears for
          the few hundred ms it takes to fetch the page's chunk and
          shouldn't introduce its own layout shift.
        */}
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="border-t border-[var(--color-border)] py-4 text-center text-xs text-[var(--color-muted-foreground)]">
        Built with Eikon
      </footer>
    </div>
  );
}

function RouteFallback() {
  return (
    <div
      aria-hidden="true"
      className="h-32 w-full animate-pulse rounded-md bg-[var(--color-muted)]/40"
    />
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { RootLayout };
