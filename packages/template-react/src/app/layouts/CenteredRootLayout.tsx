// @eikon:variant(layout=centered) file
/**
 * @file CenteredRootLayout.tsx
 * @description Single-card centered layout: no header chrome, no sidebar,
 * no footer — just a vertically/horizontally centered card that hosts the
 * matched route via <Outlet />. Best for auth shells (login / signup /
 * onboarding), focused single-purpose tools, and "kiosk" apps where the
 * entire experience fits one card at a time. The brand and theme/locale
 * toggles still live in the top corners so they're reachable without
 * crowding the card itself.
 *
 * Cross-platform: this is the ONE non-mobile layout the playground / CLI
 * also offers under `--platform mobile` (auth shell shape works equally
 * well on phones), which is why this file does the mobile-shaped polish
 * the other three desktop layouts skip:
 *   - `min-h-[100dvh]` instead of `min-h-screen` — iOS Safari's dynamic
 *     toolbar would otherwise push content under the URL bar.
 *   - `safe-px` / `safe-py` env() padding so notches and home-indicator
 *     bars never clip the corners or the card.
 *   - Nav links use `min-h-[var(--touch-target-min,44px)]` so the
 *     tappable area meets HIG / Material recommendations on phones
 *     while still rendering as a slim text bar on desktops.
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

function CenteredRootLayout() {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation();
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (_k: string, opts?: { defaultValue?: string }) =>
  //   opts?.defaultValue ?? _k;
  // @eikon:feature(i18n:fallback) end

  return (
    <div
      className={cn(
        'relative grid min-h-[100dvh] place-items-center',
        'bg-[var(--color-muted)]/30 px-4 py-12',
        // Safe-area on mobile: keep the card and the corner toggles
        // clear of notches / home-indicator. No-op on desktop because
        // env(safe-area-inset-*) resolves to 0 there.
        'pt-[max(3rem,calc(2rem+env(safe-area-inset-top)))]',
        'pb-[max(3rem,calc(2rem+env(safe-area-inset-bottom)))]',
        'pl-[max(1rem,env(safe-area-inset-left))]',
        'pr-[max(1rem,env(safe-area-inset-right))]'
      )}
    >
      {/*
        Brand in the top-left corner. Kept absolutely positioned so it does
        NOT consume vertical space — the card stays perfectly vertically
        centered even on tall viewports. Hidden on very narrow screens to
        avoid colliding with the card. The `top` offset already accounts
        for the safe-area inset via the parent's padding.
      */}
      <Link
        to="/"
        className="absolute top-4 left-4 hidden text-sm font-semibold tracking-tight sm:block"
      >
        Eikon App
      </Link>
      {/* Theme & locale toggles, mirrored in the top-right corner. */}
      <div className="absolute top-4 right-4 flex items-center gap-1">
        {/* @eikon:feature(i18n) begin */}
        <LanguageSwitcher />
        {/* @eikon:feature(i18n) end */}
        <ThemeToggle />
      </div>
      {/*
        The card itself + a minimal text-link nav directly under it, stacked
        in a flex column. The nav is intentionally chrome-free (no buttons,
        no borders) so it stays out of the way for auth-style flows but
        still gives demo / dev a reachable jump between routes.
      */}
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <main
          className={cn(
            'w-full rounded-lg border border-[var(--color-border)]',
            'bg-[var(--color-card)] p-6 shadow-sm'
          )}
        >
          {/*
            Shared Suspense boundary for every lazy-loaded page in the app.
            The fallback intentionally matches the card's footprint so route
            swaps don't reflow the centered cell.
          */}
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
        <nav
          aria-label="Primary"
          className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]"
        >
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  // 44px tap target for mobile (Apple HIG); on desktop
                  // it just adds vertical padding around the text link,
                  // so the visual rhythm is unchanged.
                  'inline-flex items-center rounded-md px-3 transition-colors',
                  'min-h-[var(--touch-target-min,44px)]',
                  'hover:text-[var(--color-foreground)]',
                  isActive && 'text-[var(--color-foreground)] underline'
                )
              }
            >
              {t(link.key, { defaultValue: link.fallback })}
            </NavLink>
          ))}
        </nav>
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

export { CenteredRootLayout };
