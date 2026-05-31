// @eikon:variant(layout=bottom-tabs-fab) file
/**
 * @file BottomTabsFabRootLayout.tsx
 * @description Mobile bottom-tabs layout with a centred floating action
 * button. The FAB sits visually above the tab row and represents the
 * app's "primary write" action — by default it links to `/tasks` (the
 * tasks feature's main entry); replace the destination with whatever the
 * scaffolded app's primary write is (compose / new entry / capture).
 *
 * Best for app-shell-style mobile apps where ONE action dominates the
 * UX (Twitter compose, WeChat camera, Reddit submit, Strava record).
 * Use `BottomTabsRootLayout` if no single action stands out.
 *
 * Implementation notes:
 *   - The tab row is split into 4 cells with the centre column reserved
 *     for the FAB; the FAB itself is rendered absolutely so it can
 *     translate above the bar without disturbing the grid baseline.
 *   - Tabs themselves are 3 (Home + 2) — adding a fourth tab would
 *     reduce icon-label legibility on narrow screens. If you need a 4th
 *     destination, prefer `BottomTabsRootLayout` (no FAB).
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
  Home,
  type LucideIcon,
  Plus,
  Sparkles,
  User,
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
  key: string;
  fallback: string;
  icon: LucideIcon;
  end?: boolean;
}

// =================================================================================================
// Constants
// =================================================================================================

/**
 * Two tabs on each side of the central FAB. The router still has a
 * `Tasks` page, but in this layout `Tasks` is the FAB target — `User`
 * (a placeholder profile route) and `Examples` (DEV-only) sit on the
 * right-hand side. Adapt to your app's navigation taxonomy.
 */
const leftTabs: TabSpec[] = [
  { to: '/', key: 'nav.home', fallback: 'Home', icon: Home, end: true },
  { to: '/counter', key: 'nav.counter', fallback: 'Counter', icon: Plus },
];

const rightTabs: TabSpec[] = [
  { to: '/tasks', key: 'nav.tasks', fallback: 'Tasks', icon: CheckSquare },
  // Examples is a DEV-ONLY showcase route; in production builds the
  // ternary falls through to `/profile`, leaving a single tab on the
  // right side instead of two.
  ...(import.meta.env.DEV
    ? [
        {
          to: '/examples',
          key: 'nav.examples',
          fallback: 'Examples',
          icon: Sparkles,
        },
      ]
    : [
        {
          to: '/profile',
          key: 'nav.profile',
          fallback: 'Profile',
          icon: User,
        },
      ]),
];

// =================================================================================================
// Component
// =================================================================================================

function BottomTabsFabRootLayout() {
  const { t } = useTranslation();


  return (
    <div className="flex min-h-[100dvh] flex-col [--app-topbar-h:3.5rem] [--app-bottombar-h:calc(4rem+env(safe-area-inset-bottom,0px))]">
      <header
        className={cn(
          'sticky top-0 z-30 border-b-[length:var(--surface-border-width)] border-[var(--color-sidebar-border)]',
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
      <main
        className={cn(
          'mx-auto w-full max-w-3xl flex-1 px-4 py-6',
          // Reserve room for the tab bar (4rem) + FAB overshoot (~1.5rem)
          // + safe-area-inset-bottom. Using `max(...)` so older browsers
          // fall back to the literal `5.5rem` rather than zero.
          'pb-[max(5.5rem,calc(4.5rem+env(safe-area-inset-bottom)))]'
        )}
      >
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      {/*
        Fixed tab bar. The CSS grid below uses `1fr 1fr auto 1fr 1fr` so
        the centre cell is exactly the FAB's footprint while the four
        flanking tabs take the remaining width equally.
      */}
      <nav
        aria-label={t('nav.primary', { defaultValue: 'Primary navigation' })}
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 border-t-[length:var(--surface-border-width)] border-[var(--color-sidebar-border)]',
          'bg-[var(--color-sidebar)]/95 text-[var(--color-sidebar-foreground)] backdrop-blur',
          'pb-[env(safe-area-inset-bottom)]'
        )}
      >
        <div className="relative mx-auto h-16 max-w-3xl">
          <ul className="grid h-full grid-cols-[1fr_1fr_auto_1fr_1fr]">
            {leftTabs.map((tab) => (
              <TabButton key={tab.to} tab={tab} t={t} />
            ))}
            {/*
              Centre slot — empty cell that reserves space; the FAB
              itself is positioned absolutely below so it can translate
              above the bar without breaking the icon row's vertical
              alignment.
            */}
            <li aria-hidden="true" className="w-16" />
            {rightTabs.map((tab) => (
              <TabButton key={tab.to} tab={tab} t={t} />
            ))}
          </ul>
          {/*
            FAB: links to the tasks feature's main entry. Replace the
            destination + icon with the app's primary write action when
            you adopt this layout.
          */}
          <Link
            to="/tasks"
            aria-label={t('nav.compose', { defaultValue: 'New task' })}
            className={cn(
              'absolute left-1/2 -top-5 -translate-x-1/2',
              'inline-flex h-14 w-14 items-center justify-center rounded-full',
              'bg-[var(--color-sidebar-primary)] text-[var(--color-sidebar-primary-foreground)]',
              'shadow-lg ring-4 ring-[var(--color-sidebar)]',
              'transition-transform active:scale-95',
              'min-h-[var(--touch-target-min,44px)] min-w-[var(--touch-target-min,44px)]'
            )}
          >
            <Plus className="h-6 w-6" />
          </Link>
        </div>
      </nav>
    </div>
  );
}

interface TabButtonProps {
  tab: TabSpec;
  t: (key: string, opts?: { defaultValue?: string }) => string;
}

/**
 * Tab cell. Pulled out of the main component so the React tree mirrors
 * the visual rhythm of the tab bar (left × N → FAB-spacer → right × N)
 * and so the className can stay compact at the call site.
 */
function TabButton({ tab, t }: TabButtonProps) {
  return (
    <li className="flex">
      <NavLink
        to={tab.to}
        end={tab.end}
        className={({ isActive }) =>
          cn(
            'flex w-full flex-col items-center justify-center gap-0.5',
            'text-[10px] font-medium uppercase tracking-wide',
            'min-h-[var(--touch-target-min,44px)]',
            'transition-colors',
            isActive
              ? 'text-[var(--color-sidebar-primary)]'
              : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
          )
        }
      >
        <tab.icon className="h-5 w-5" aria-hidden="true" />
        <span>{t(tab.key, { defaultValue: tab.fallback })}</span>
      </NavLink>
    </li>
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

export { BottomTabsFabRootLayout };
