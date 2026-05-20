// @eikon:variant(layout=mobile-drawer) file
/**
 * @file MobileDrawerRootLayout.tsx
 * @description Mobile-first drawer layout: a slim sticky topbar carries the
 * brand and a hamburger, primary navigation lives behind that hamburger in
 * a left-anchored Sheet, and the main column fills the rest of the
 * viewport. Best for content-heavy mobile apps where a persistent bottom
 * tab bar would be overkill (reading apps, settings hubs, single-feature
 * tools that still need an accessible nav).
 *
 * Mobile polish:
 *   - `viewport-fit=cover` + `safe-pt`/`safe-pb` keeps content out from
 *     under iOS notches and the home-indicator bar.
 *   - Touch targets are at least `--touch-target-min` (44px on iOS HIG /
 *     48dp on Android) — both the hamburger and each drawer NavLink.
 *   - `hover:` states are gated by `(hover: hover)` via the standard
 *     Tailwind `hover:` utility plus an extra-thumbnail safety: most of
 *     the active styling lives under `aria-current="page"` (set by
 *     react-router NavLink) so it works regardless of input modality.
 *
 * One of the layout variants selected via `--layout` at scaffold time;
 * the dispatcher at `./RootLayout.tsx` re-exports whichever variant won.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { Suspense, useState } from 'react';

// --- Core-related Libraries ---
// @eikon:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @eikon:feature(i18n) end
import { Link, NavLink, Outlet } from 'react-router-dom';

// --- Third-party Libraries ---
import { Menu } from 'lucide-react';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet';
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
  // `import.meta.env.DEV` is true (see app/router.tsx); the CLI strips
  // this entry from scaffolded projects so end users never see a
  // broken link in their drawer.
  ...(import.meta.env.DEV
    ? [{ to: '/examples', key: 'nav.examples', fallback: 'Examples' }]
    : []),
  // @eikon:feature(examples) end
];

// =================================================================================================
// Component
// =================================================================================================

function MobileDrawerRootLayout() {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation();
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (_k: string, opts?: { defaultValue?: string }) =>
  //   opts?.defaultValue ?? _k;
  // @eikon:feature(i18n:fallback) end

  // The drawer is parent-controlled so each NavLink click can close it
  // explicitly (otherwise the drawer would stay open across in-app
  // navigation, which the user almost never wants on mobile).
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/*
        Sticky topbar. Uses `100dvh` rather than `100vh` so the layout
        accounts for iOS Safari's dynamic toolbar — `100vh` would
        overshoot when the toolbar collapses on scroll. The header
        respects safe-area-top so the brand stays clear of the notch.
      */}
      <header
        className={cn(
          'sticky top-0 z-30 border-b border-[var(--color-border)]',
          'bg-[var(--color-card)]/85 backdrop-blur',
          'pt-[env(safe-area-inset-top)]'
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 px-3">
          <Sheet open={open} onOpenChange={setOpen} side="left">
            <SheetTrigger
              aria-label={t('nav.menu', { defaultValue: 'Open navigation' })}
              className={cn(
                'inline-flex items-center justify-center rounded-md',
                'min-h-[var(--touch-target-min,44px)] min-w-[var(--touch-target-min,44px)]',
                'text-[var(--color-foreground)] transition-colors',
                'hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]'
              )}
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent
              description={t('nav.menuDescription', {
                defaultValue: 'Primary navigation for the application',
              })}
            >
              <SheetHeader>
                <SheetTitle>Eikon App</SheetTitle>
              </SheetHeader>
              <SheetBody>
                <nav className="flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <SheetClose key={link.to} asChild>
                      <NavLink
                        to={link.to}
                        end={link.end}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center rounded-md px-3 text-sm transition-colors',
                            'min-h-[var(--touch-target-min,44px)]',
                            'text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]',
                            isActive &&
                              'bg-[var(--color-accent)] text-[var(--color-accent-foreground)]'
                          )
                        }
                      >
                        {t(link.key, { defaultValue: link.fallback })}
                      </NavLink>
                    </SheetClose>
                  ))}
                </nav>
              </SheetBody>
            </SheetContent>
          </Sheet>
          <Link to="/" className="text-sm font-semibold tracking-tight">
            Eikon App
          </Link>
          <div className="flex items-center gap-1">
            {/* @eikon:feature(i18n) begin */}
            <LanguageSwitcher />
            {/* @eikon:feature(i18n) end */}
            <ThemeToggle />
          </div>
        </div>
      </header>
      {/*
        Main column. `flex-1` swallows remaining vertical space; the
        bottom safe-area inset is honoured here because this layout has
        no bottom chrome — the home-indicator bar otherwise eats the
        last few pixels of content.
      */}
      <main
        className={cn(
          'mx-auto w-full max-w-3xl flex-1 px-4 py-6',
          'pb-[max(1.5rem,env(safe-area-inset-bottom))]'
        )}
      >
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

export { MobileDrawerRootLayout };
