// @eikon:variant(layout=stacked) file
/**
 * @file StackedRootLayout.tsx
 * @description Classic stacked layout: full-width header on top, centered
 * `max-w-5xl` main column for content, footer at the bottom. The most
 * generic shell — best for marketing sites, blogs, docs landings, and any
 * content-first app where the navigation belongs above the fold.
 *
 * One of the seven layout variants selected via `--layout` at scaffold time;
 * the dispatcher at `./RootLayout.tsx` re-exports whichever variant won.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { Suspense } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet } from 'react-router-dom';

// --- Absolute Imports ---
import { SignInButton } from '@/features/auth';
import { cn } from '@/shared/lib/cn';
import { navLinks } from '@/shared/nav';
import { LanguageSwitcher } from '@/shared/ui/language-switcher';
import { ThemeToggle } from '@/shared/ui/theme-toggle';

// =================================================================================================
// Component
// =================================================================================================

function StackedRootLayout() {
  const { t } = useTranslation();


  return (
    <div className="flex min-h-[100dvh] flex-col [--app-static-topbar-h:3.5rem]">
      <header className="app-nav-shell app-nav-top border-b-[length:var(--surface-border-width)] border-[var(--color-sidebar-border)] bg-[var(--color-sidebar)]/70 text-[var(--color-sidebar-foreground)] backdrop-blur">
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
                    'app-nav-link rounded-md px-3 py-1.5 text-sm transition-colors',
                    'text-[var(--color-muted-foreground)] hover:bg-[var(--color-sidebar-primary)]/8 hover:text-[var(--color-sidebar-foreground)]',
                    isActive &&
                      'app-nav-link-active bg-[var(--color-sidebar-primary)]/12 text-[var(--color-sidebar-primary)]'
                  )
                }
              >
                {t(link.key, { defaultValue: link.fallback })}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center justify-self-end gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
            <SignInButton />
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
      <footer className="border-t-[length:var(--surface-border-width)] border-[var(--color-border)] py-4 text-center text-xs text-[var(--color-muted-foreground)]">
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

export { StackedRootLayout };
