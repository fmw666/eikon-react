import { Link, NavLink, Outlet } from 'react-router-dom';

import { cn } from '@/shared/lib/cn';

const navLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/counter', label: 'Counter' },
];

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
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
