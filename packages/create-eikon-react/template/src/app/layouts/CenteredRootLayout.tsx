// @eikon:variant(layout=centered) file
/**
 * @file CenteredRootLayout.tsx
 * @description Minimal centered layout. Routes render in a focused card with
 * a lightweight top chrome for navigation and global actions.
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

function CenteredRootLayout() {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex min-h-[100dvh] flex-col [--app-static-topbar-h:4rem]',
        'bg-[var(--color-muted)]/25'
      )}
    >
      <header
        className={cn(
          'sticky top-0 z-20 border-b-[length:var(--surface-border-width)] border-[var(--color-border)]',
          'bg-[var(--color-background)]/88 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-background)]/72'
        )}
      >
        <div
          className={cn(
            'mx-auto flex min-h-16 w-full max-w-6xl items-center gap-3',
            'pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]'
          )}
        >
          <Link
            to="/"
            className="shrink-0 text-sm font-semibold tracking-tight"
          >
            Eikon App
          </Link>

          <nav
            aria-label="Primary"
            className="hidden min-w-0 flex-1 items-center justify-center gap-1 text-xs text-[var(--color-muted-foreground)] sm:flex"
          >
            {navLinks.map((link) => (
              <CenteredNavLink
                key={link.to}
                to={link.to}
                end={link.end}
                label={t(link.key, { defaultValue: link.fallback })}
              />
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
            <SignInButton />
          </div>
        </div>

        <nav
          aria-label="Primary"
          className="flex overflow-x-auto border-t-[length:var(--surface-border-width)] border-[var(--color-border)] px-3 text-xs text-[var(--color-muted-foreground)] sm:hidden"
        >
          {navLinks.map((link) => (
            <CenteredNavLink
              key={link.to}
              to={link.to}
              end={link.end}
              label={t(link.key, { defaultValue: link.fallback })}
            />
          ))}
        </nav>
      </header>

      <main
        className={cn(
          'flex min-h-0 w-full flex-1',
          'pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]',
          'items-center justify-center py-10'
        )}
      >
        <div
          className={cn(
            'w-full',
            'max-w-lg rounded-lg border-[length:var(--surface-border-width)] border-[var(--color-border)]',
            'bg-[var(--color-card)] p-6 shadow-sm'
          )}
        >
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

function CenteredNavLink({
  to,
  end,
  label,
}: {
  to: string;
  end?: boolean;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'inline-flex min-h-[var(--touch-target-min,44px)] shrink-0 items-center rounded-md px-3 transition-colors',
          'hover:text-[var(--color-foreground)]',
          isActive
            ? 'bg-[var(--color-muted)] text-[var(--color-foreground)]'
            : 'text-[var(--color-muted-foreground)]'
        )
      }
    >
      {label}
    </NavLink>
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

export { CenteredRootLayout };
