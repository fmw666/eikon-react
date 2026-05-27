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
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet } from 'react-router-dom';

// --- Third-party Libraries ---
import {
  CheckSquare,
  Home,
  type LucideIcon,
  Menu,
  Plus,
  Sparkles,
} from 'lucide-react';

// --- Absolute Imports ---
import { SignInButton } from '@/features/auth';
import { cn } from '@/shared/lib/cn';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet';
import { LanguageSwitcher } from '@/shared/ui/language-switcher';
import { ThemeToggle } from '@/shared/ui/theme-toggle';

// =================================================================================================
// Types
// =================================================================================================

interface NavLinkSpec {
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

const navLinks: NavLinkSpec[] = [
  { to: '/', key: 'nav.home', fallback: 'Home', icon: Home, end: true },
  { to: '/counter', key: 'nav.counter', fallback: 'Counter', icon: Plus },
  { to: '/tasks', key: 'nav.tasks', fallback: 'Tasks', icon: CheckSquare },
  // @eikon:feature(examples) begin
  // Examples is a DEV-ONLY showcase. The route only registers when
  // `import.meta.env.DEV` is true (see app/router.tsx); the CLI strips
  // this entry from scaffolded projects so end users never see a
  // broken link in their drawer.
  ...(import.meta.env.DEV
    ? [
        {
          to: '/examples',
          key: 'nav.examples',
          fallback: 'Examples',
          icon: Sparkles,
        },
      ]
    : []),
  // @eikon:feature(examples) end
];

// =================================================================================================
// Component
// =================================================================================================

function MobileDrawerRootLayout() {
  const { t } = useTranslation();


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
          'sticky top-0 z-30 border-b-[length:var(--surface-border-width)] border-[var(--color-border)]',
          'bg-[var(--color-card)]/85 backdrop-blur',
          'pt-[env(safe-area-inset-top)]'
        )}
      >
        <div className="flex h-14 items-center gap-2 px-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label={t('nav.menu', { defaultValue: 'Open navigation' })}
              className={cn(
                'inline-flex items-center justify-center rounded-md',
                'min-h-[var(--touch-target-min,44px)] min-w-[var(--touch-target-min,44px)]',
                'text-[var(--color-foreground)] transition-colors',
                'hover:bg-[var(--color-primary)]/8 hover:text-[var(--color-foreground)]'
              )}
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold tracking-tight',
                      'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]',
                      'shadow-[0_4px_14px_-4px_var(--color-primary)]'
                    )}
                  >
                    E
                  </span>
                  <SheetTitle>Eikon App</SheetTitle>
                </div>
                <SheetDescription className="text-[0.8125rem] leading-relaxed">
                  {t('nav.menuDescription', {
                    defaultValue: 'Jump to any section of the app.',
                  })}
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-3 py-5">
                <p
                  className={cn(
                    'px-2 pb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.14em]',
                    'text-[var(--color-muted-foreground)]/80'
                  )}
                >
                  {t('nav.sectionLabel', { defaultValue: 'Navigation' })}
                </p>
                <nav className="flex flex-col gap-1">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <SheetClose key={link.to} asChild>
                        <NavLink
                          to={link.to}
                          end={link.end}
                          className={({ isActive }) =>
                            cn(
                              'group flex items-center gap-3 rounded-xl px-2 py-2 text-[0.9375rem] transition-colors',
                              isActive
                                ? 'bg-[var(--color-accent)]/60'
                                : 'hover:bg-[var(--color-accent)]/40'
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <span
                                aria-hidden="true"
                                className={cn(
                                  'grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors',
                                  isActive
                                    ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                                    : 'bg-[var(--color-muted)]/70 text-[var(--color-muted-foreground)] group-hover:bg-[var(--color-muted)] group-hover:text-[var(--color-foreground)]'
                                )}
                              >
                                <Icon className="h-[18px] w-[18px]" />
                              </span>
                              <span
                                className={cn(
                                  'truncate transition-colors',
                                  isActive
                                    ? 'font-semibold text-[var(--color-foreground)]'
                                    : 'font-medium text-[var(--color-foreground)]/85 group-hover:text-[var(--color-foreground)]'
                                )}
                              >
                                {t(link.key, { defaultValue: link.fallback })}
                              </span>
                            </>
                          )}
                        </NavLink>
                      </SheetClose>
                    );
                  })}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
          <Link to="/" className="text-sm font-semibold tracking-tight">
            Eikon App
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
            <SignInButton />
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
