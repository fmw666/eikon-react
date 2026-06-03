// @eikon:variant(layout=bottom-tabs) file
/**
 * @file BottomTabsRootLayout.tsx
 * @description Mobile bottom-tabs layout: a slim sticky topbar carries the
 * brand and global actions (theme + locale), the main column scrolls
 * freely, and a fixed bottom tab bar exposes 3-4 primary destinations.
 * Best for app-shell-style mobile apps (Instagram / Spotify / Reddit
 * pattern) where users rapid-switch between top-level sections.
 *
 * Mobile polish:
 *   - Bottom bar sits above `env(safe-area-inset-bottom)` so it doesn't
 *     overlap the iOS home-indicator bar.
 *   - Each tab is at least `--touch-target-min` tall and uses an icon +
 *     label pair (Apple HIG / Material 3 standard).
 *   - Active state is driven by react-router's `aria-current="page"` —
 *     no bespoke active-state hooks needed.
 *
 * Tabs displayed: Home / Counter / Tasks (+ Examples in dev). The
 * `Examples` tab is gated by `import.meta.env.DEV` so production
 * bundles drop it.
 *
 * One of the layout variants selected via `--layout` at scaffold time;
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

// --- Third-party Libraries ---
import {
  CheckSquare,
  Component,
  Home,
  type LucideIcon,
  Plus,
} from 'lucide-react';

// --- Absolute Imports ---
import { SignInButton } from '@/features/auth';
import { cn } from '@/shared/lib/cn';
import { LanguageSwitcher } from '@/shared/ui/language-switcher';
import { ThemeToggle } from '@/shared/ui/theme-toggle';

// =================================================================================================
// Types
// =================================================================================================

interface TabSpec {
  to: string;
  /** i18n key for the label. */
  key: string;
  fallback: string;
  icon: LucideIcon;
  end?: boolean;
}

// =================================================================================================
// Constants
// =================================================================================================

const tabs: TabSpec[] = [
  { to: '/', key: 'nav.home', fallback: 'Home', icon: Home, end: true },
  { to: '/counter', key: 'nav.counter', fallback: 'Counter', icon: Plus },
  { to: '/tasks', key: 'nav.tasks', fallback: 'Tasks', icon: CheckSquare },
  ...(import.meta.env.DEV
    ? [
        {
          to: '/examples',
          key: 'nav.examples',
          fallback: 'Examples',
          icon: Component,
        },
      ]
    : []),
];

// =================================================================================================
// Component
// =================================================================================================

function BottomTabsRootLayout() {
  const { t } = useTranslation();


  return (
    <div className="flex min-h-[100dvh] flex-col [--app-topbar-h:3.5rem] [--app-bottombar-h:calc(4rem+env(safe-area-inset-bottom,0px))]">
      <header
        className={cn(
          'app-nav-shell app-nav-top sticky top-0 z-30 border-b-[length:var(--surface-border-width)] border-[var(--color-sidebar-border)]',
          'bg-[var(--color-sidebar)]/85 text-[var(--color-sidebar-foreground)] backdrop-blur',
          'pt-[env(safe-area-inset-top)]'
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 px-4">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            Eikon App
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
            <SignInButton />
          </div>
        </div>
      </header>
      {/*
        Main scroll area. The `pb-` value reserves space for the bottom
        tab bar (h-16 = 4rem) PLUS the safe-area inset. We use `max()`
        with the safe-area function so older browsers fall back to a
        plain 4rem reservation rather than collapsing to zero.
      */}
      <main
        className={cn(
          'mx-auto w-full max-w-3xl flex-1 px-4 py-6',
          'pb-[max(5rem,calc(4rem+env(safe-area-inset-bottom)))]'
        )}
      >
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      {/*
        Fixed bottom tab bar. `inset-x-0 bottom-0` anchors it; the
        `pb-[env(safe-area-inset-bottom)]` shifts the visible row up so
        the home-indicator on iOS never overlaps the tap targets.
      */}
      <nav
        aria-label={t('nav.primary', { defaultValue: 'Primary navigation' })}
        className={cn(
          'app-nav-shell app-nav-bottom fixed inset-x-0 bottom-0 z-30 border-t-[length:var(--surface-border-width)] border-[var(--color-sidebar-border)]',
          'bg-[var(--color-sidebar)]/95 text-[var(--color-sidebar-foreground)] backdrop-blur',
          'pb-[env(safe-area-inset-bottom)]'
        )}
      >
        <ul className="mx-auto flex h-16 max-w-3xl items-stretch justify-around">
          {tabs.map((tab) => (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    'app-bottom-nav-link flex h-full flex-col items-center justify-center gap-0.5',
                    'text-[10px] font-medium uppercase tracking-wide',
                    'min-h-[var(--touch-target-min,44px)]',
                    'transition-colors',
                    isActive
                      ? 'app-bottom-nav-link-active text-[var(--color-sidebar-primary)]'
                      : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
                  )
                }
              >
                <tab.icon className="h-5 w-5" aria-hidden="true" />
                <span>{t(tab.key, { defaultValue: tab.fallback })}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
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

export { BottomTabsRootLayout };
