import { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

import { cn } from '@/shared/lib/cn';

const navLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/counter', label: 'Counter' },
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

export function RootLayout() {
  return (
    <div className={cn('flex min-h-screen flex-col', LAYOUT_VARIANT_CLASS)}>
      <header className="border-b border-[var(--color-border)] bg-[var(--color-card)]/70 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            Eikon App
          </Link>
          <nav className="flex items-center gap-1">
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
                {link.label}
              </NavLink>
            ))}
          </nav>
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
