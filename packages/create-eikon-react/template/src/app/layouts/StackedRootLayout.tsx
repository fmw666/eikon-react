// @eikon:variant(layout=stacked) file
/**
 * @file StackedRootLayout.tsx
 * @description Classic stacked layout: full-width header on top, centered
 * `max-w-5xl` main column for content, footer at the bottom. The most
 * generic shell — best for marketing sites, blogs, docs landings, and any
 * content-first app where the navigation belongs above the fold.
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
  /** i18n key for the label. Falls back to literal English when i18n is stripped. */
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
  // Examples is a DEV-ONLY showcase. The route only registers when
  // `import.meta.env.DEV` is true (see app/router.tsx), so production
  // template builds never wire it in. The CLI additionally strips this
  // whole entry out of scaffolded projects so end users never see a
  // broken link in their nav. The preview playground keeps the showcase
  // and builds the template as `mode: 'development'`, so the gate stays
  // open inside its iframe.
  ...(import.meta.env.DEV
    ? [{ to: '/examples', key: 'nav.examples', fallback: 'Examples' }]
    : []),
  // @eikon:feature(examples) end
];

// =================================================================================================
// Component
// =================================================================================================

function StackedRootLayout() {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation();
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (_k: string, opts?: { defaultValue?: string }) =>
  //   opts?.defaultValue ?? _k;
  // @eikon:feature(i18n:fallback) end

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="border-b-[length:var(--surface-border-width)] border-[var(--color-border)] bg-[var(--color-card)]/70 backdrop-blur">
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
                    'rounded-md px-3 py-1.5 text-sm transition-colors',
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
          <div className="flex items-center justify-self-end gap-1">
            {/* @eikon:feature(i18n) begin */}
            <LanguageSwitcher />
            {/* @eikon:feature(i18n) end */}
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
