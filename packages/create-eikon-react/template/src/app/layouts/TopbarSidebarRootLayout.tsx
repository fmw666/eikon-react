// @eikon:variant(layout=topbar-sidebar) file
/**
 * @file TopbarSidebarRootLayout.tsx
 * @description Hybrid topbar + sidebar layout: a full-width header owns the
 * brand and the global actions (theme/locale/account/search), while a
 * narrower left rail owns the contextual navigation, and the main column
 * fills the rest. Best for complex multi-product / multi-workspace apps
 * where the top bar carries cross-app concerns and the side rail carries
 * the in-product nav (GitHub, Jira, Sentry, GitLab, Confluence, …).
 *
 * One of the four layout variants selected via `--layout` at scaffold time;
 * the dispatcher at `./RootLayout.tsx` re-exports whichever variant won.
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
import { SignInButton } from '@/features/auth';
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
  // @eikon:feature(examples) begin
  // Dev-only — see StackedRootLayout for the full rationale.
  ...(import.meta.env.DEV
    ? [{ to: '/examples', key: 'nav.examples', fallback: 'Examples' }]
    : []),
  // @eikon:feature(examples) end
];

// =================================================================================================
// Component
// =================================================================================================

function TopbarSidebarRootLayout() {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation();
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (_k: string, opts?: { defaultValue?: string }) =>
  //   opts?.defaultValue ?? _k;
  // @eikon:feature(i18n:fallback) end

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header
        className={cn(
          'sticky top-0 z-10 border-b-[length:var(--surface-border-width)] border-[var(--color-border)]',
          'bg-[var(--color-card)]/70 backdrop-blur'
        )}
      >
        {/*
          Two-region top bar: brand on the left (1fr), global actions on the
          right (auto). Drop a search/command-palette trigger or workspace
          switcher into the left cell next to the brand if you need it.
        */}
        <div className="flex h-14 items-center justify-between gap-4 px-4">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            Eikon App
          </Link>
          <div className="flex items-center gap-1">
            {/* @eikon:feature(i18n) begin */}
            <LanguageSwitcher />
            {/* @eikon:feature(i18n) end */}
            <ThemeToggle />
            <SignInButton />
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        {/*
          Contextual navigation rail. Narrower than the sidebar-only layout
          (56 vs 60) because the topbar already carries the brand — the rail
          can focus on in-product nav. Sticky so it stays put while the main
          column scrolls.
        */}
        <aside
          className={cn(
            'sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 md:flex',
            'flex-col border-r-[length:var(--surface-border-width)] border-[var(--color-border)]',
            'bg-[var(--color-card)]/50'
          )}
        >
          <nav className="flex flex-1 flex-col gap-1 p-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm transition-colors',
                    'text-[var(--color-muted-foreground)] hover:bg-[var(--color-primary)]/8 hover:text-[var(--color-foreground)]',
                    isActive &&
                      'bg-[var(--color-primary)]/12 text-[var(--color-primary)]'
                  )
                }
              >
                {t(link.key, { defaultValue: link.fallback })}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 md:px-8">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
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

export { TopbarSidebarRootLayout };
