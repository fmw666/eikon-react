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
    // @evomap:variant(layout=stacked) begin
    'layout-stacked',
    // @evomap:variant(layout=stacked) end
    // @evomap:variant(layout=sidebar) begin
    'layout-sidebar',
    // @evomap:variant(layout=sidebar) end
    // @evomap:variant(layout=topbar) begin
    'layout-topbar',
    // @evomap:variant(layout=topbar) end
  ].at(0) ?? 'layout-stacked';

export function RootLayout() {
  return (
    <div className={cn('flex min-h-screen flex-col', LAYOUT_VARIANT_CLASS)}>
      <header className="border-b border-[var(--color-border)] bg-[var(--color-card)]/70 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            EvoMap App
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
        <Outlet />
      </main>
      <footer className="border-t border-[var(--color-border)] py-4 text-center text-xs text-[var(--color-muted-foreground)]">
        Built with EvoMap starter
      </footer>
    </div>
  );
}
