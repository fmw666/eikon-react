// @eikon:variant(layout=sidebar) file
/**
 * @file SidebarRootLayout.tsx
 * @description Fixed left sidebar layout: a 240-px-wide vertical rail owns
 * the brand, the primary navigation, and the user/theme/locale actions; the
 * main column fills the remaining width. Best for admin consoles, SaaS
 * dashboards, and any "tool" app where navigation is the spine of the
 * experience (Linear, Notion, Supabase Studio, …).
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

function SidebarRootLayout() {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation();
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (_k: string, opts?: { defaultValue?: string }) =>
  //   opts?.defaultValue ?? _k;
  // @eikon:feature(i18n:fallback) end

  return (
    <div className="flex min-h-[100dvh]">
      {/*
        The sidebar is a real flex column rather than a positioned overlay —
        sticky positioning keeps it visible while the main column scrolls,
        and `shrink-0` prevents it from collapsing on narrow content. Adjust
        `w-60` if your nav grows or you need a denser rail.
      */}
      <aside
        className={cn(
          'sticky top-0 flex h-[100dvh] w-60 shrink-0 flex-col',
          'border-r border-[var(--color-border)] bg-[var(--color-card)]/70 backdrop-blur'
        )}
      >
        <div className="flex h-14 items-center border-b border-[var(--color-border)] px-4">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            Eikon App
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm transition-colors',
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
        <div className="flex flex-wrap items-center gap-1 border-t border-[var(--color-border)] p-2">
          {/* @eikon:feature(i18n) begin */}
          <LanguageSwitcher />
          {/* @eikon:feature(i18n) end */}
          <ThemeToggle />
          <SignInButton />
        </div>
      </aside>
      <main className="mx-auto w-full max-w-5xl flex-1 px-8 py-8">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
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

export { SidebarRootLayout };
