/**
 * @file ExamplesSidebar.tsx
 * @description Persistent categorised left-nav for the examples shell.
 *
 * Doc-site lineage (shadcn / Tailwind / Vercel / Stripe / Linear): no
 * surrounding card chrome, just a vertical list with a single right-edge
 * divider; the header (title + filter) sticks at the top of the
 * independently-scrolling panel so the search box never disappears.
 *
 * Affordances:
 *   - Sticky title + type-to-filter (clearable, no-results line).
 *   - Per-group counts, mirroring the overview grid.
 *   - Active link uses a left indicator strip + raised text weight
 *     (no full-bleed accent fill — too "menu-y" for documentation nav).
 *   - Each item carries a small visual anchor dot that lights up to the
 *     primary colour on hover / active for fast vertical scanning.
 *   - Active link is scrolled into view on every route change.
 *   - Collapsible on narrow shells: a disclosure toggle replaces the long
 *     list; on wide shells the nav is always shown (container query).
 *   - Visible focus rings on the search box and every link.
 *
 * The inline-component groups are generated from the `exampleSections`
 * registry; the standalone showcases (Toaster, Dialog, …) and
 * Performance are appended as route links.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useEffect, useMemo, useRef, useState } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';

// --- Third-party Libraries ---
import { ChevronDown, Search, X } from 'lucide-react';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';

// --- Relative Imports ---
import { GROUP_ORDER, sectionsByGroup } from './exampleSections';

// =================================================================================================
// Types
// =================================================================================================

interface NavLinkItem {
  to: string;
  label: string;
  /** Match only the exact path (used for the Overview root link). */
  end?: boolean;
}

interface NavGroup {
  label: string;
  items: NavLinkItem[];
}

// =================================================================================================
// Component
// =================================================================================================

function ExamplesSidebar() {
  const { t } = useTranslation('examples');
  const { pathname } = useLocation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const groups: NavGroup[] = useMemo(
    () => [
      ...GROUP_ORDER.map((key) => ({
        label: t(`toc.${key}`),
        items: sectionsByGroup(key).map((s) => ({
          to: `/examples/${s.slug}`,
          label: t(`sections.${s.slug}.title`),
        })),
      })),
      {
        label: t('toc.modals'),
        items: [
          { to: '/examples/toaster', label: t('pages.toaster.title') },
          { to: '/examples/dialog', label: t('pages.dialog.title') },
          // @eikon:variant(layout=mobile-drawer) begin
          { to: '/examples/sheet', label: t('pages.sheet.title') },
          // @eikon:variant(layout=mobile-drawer) end
          { to: '/examples/command', label: t('pages.command.title') },
          { to: '/examples/sign-in-modal', label: t('pages.signInModal.title') },
        ],
      },
      {
        label: t('toc.performance'),
        items: [
          { to: '/examples/motion', label: t('pages.motion.title') },
          { to: '/examples/performance', label: t('pages.performance.title') },
        ],
      },
    ],
    [t]
  );

  const q = query.trim().toLowerCase();
  const filteredGroups = useMemo(
    () =>
      groups
        .map((g) => ({
          ...g,
          items: q
            ? g.items.filter((i) => i.label.toLowerCase().includes(q))
            : g.items,
        }))
        .filter((g) => g.items.length > 0),
    [groups, q]
  );

  // Keep the active link visible inside the panel's own scroll container.
  useEffect(() => {
    const active = containerRef.current?.querySelector('[aria-current="page"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [pathname]);

  return (
    <div ref={containerRef} className="text-[13px]">
      {/* Disclosure toggle — narrow shells only. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="examples-nav"
        className={cn(
          'mb-3 flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium',
          'border border-[var(--color-border)] bg-[var(--color-card)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
          '@2xl/examples:hidden'
        )}
      >
        <span>{t('toc.label')}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-[var(--duration-fast)]',
            open && 'rotate-180'
          )}
        />
      </button>

      <div
        id="examples-nav"
        className={cn(open ? 'block' : 'hidden', '@2xl/examples:block')}
      >
        {/*
          Sticky header — title + filter never scroll out of view inside
          the independently scrolling sidebar panel. `top-0` is relative
          to that panel, not the page. The background slip-stops the
          rows below from showing through as the user scrolls.
        */}
        <div className="sticky top-0 z-10 -mx-1 mb-1 bg-[var(--color-background)] px-1 pb-2 pt-1">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-foreground)]">
              {t('toc.label')}
            </h2>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('toc.filterPlaceholder')}
              aria-label={t('toc.filterPlaceholder')}
              className={cn(
                'h-8 w-full rounded-md pl-8 pr-7 text-[13px]',
                'border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)]',
                'placeholder:text-[var(--color-muted-foreground)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]'
              )}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('toc.clearFilter')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <nav aria-label={t('toc.label')}>
          <NavItem to="/examples" label={t('toc.overview')} end />

          {filteredGroups.length === 0 ? (
            <p className="mt-4 px-3 text-xs text-[var(--color-muted-foreground)]">
              {t('toc.noResults')}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-4">
              {filteredGroups.map((group) => (
                <li key={group.label}>
                  <p className="mb-1 flex items-center px-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]/80">
                    <span>{group.label}</span>
                    <span className="ml-auto text-[10px] font-medium tabular-nums text-[var(--color-muted-foreground)]/70">
                      {group.items.length}
                    </span>
                  </p>
                  <ul className="flex flex-col">
                    {group.items.map((item) => (
                      <li key={item.to}>
                        <NavItem to={item.to} label={item.label} end={item.end} />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </div>
    </div>
  );
}

// =================================================================================================
// Helpers
// =================================================================================================

function NavItem({ to, label, end }: NavLinkItem) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          // Row geometry — tight enough to fit 25+ items in a viewport.
          'group relative flex items-center gap-2 rounded-md py-1.5 pl-3 pr-2',
          'text-[13px] leading-5 transition-colors duration-[var(--duration-fast)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
          // Default
          'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
          // Active — left indicator strip + raised text weight, no full
          // accent fill. Easier to scan in a tall list.
          isActive &&
            'font-medium text-[var(--color-foreground)] ' +
              'before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[2px] before:-translate-y-1/2 before:rounded-r-full before:bg-[var(--color-primary)]'
        )
      }
    >
      {({ isActive }) => (
        <>
          {/*
            Visual anchor — a small dot that lights up to the primary
            colour on hover/active. Helps the eye lock onto rows in a
            long, dense list (Stripe + Vercel docs both use this trick).
          */}
          <span
            aria-hidden="true"
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-[var(--duration-fast)]',
              isActive
                ? 'bg-[var(--color-primary)]'
                : 'bg-[var(--color-border)] group-hover:bg-[var(--color-muted-foreground)]'
            )}
          />
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { ExamplesSidebar };
