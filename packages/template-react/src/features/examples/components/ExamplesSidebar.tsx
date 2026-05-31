/**
 * @file ExamplesSidebar.tsx
 * @description Persistent categorised left-nav for the examples shell.
 *
 * True ROUTE navigation (every item is a `<NavLink>` to its own
 * `/examples/<slug>` sub-page), plus the interaction affordances you'd
 * expect from a component gallery:
 *
 *   - Type-to-filter search box (filters items by label; empty groups
 *     drop out; a "no results" line replaces them).
 *   - Per-group counts, mirroring the overview grid.
 *   - The active link is scrolled into view on every route change, so it
 *     never hides below the fold of the (independently scrolling) panel.
 *   - Collapsible on narrow shells: a disclosure toggle replaces the long
 *     list; on wide shells the nav is always shown (container query).
 *   - Visible focus rings on the search box and every link for keyboard
 *     users.
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
      // Inline-component groups, generated from the registry.
      ...GROUP_ORDER.map((key) => ({
        label: t(`toc.${key}`),
        items: sectionsByGroup(key).map((s) => ({
          to: `/examples/${s.slug}`,
          label: t(`sections.${s.slug}.title`),
        })),
      })),
      // Standalone showcase pages that own dedicated routes.
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

  // Keep the active link visible: scroll it into the panel's view on every
  // route change (the panel is the scroll container in ExamplesLayout).
  useEffect(() => {
    const active = containerRef.current?.querySelector('[aria-current="page"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [pathname]);

  return (
    <div ref={containerRef}>
      {/* Disclosure toggle — narrow shells only; wide shells always show the nav. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="examples-nav"
        className={cn(
          'mb-2 flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium',
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
        {/* Type-to-filter search. */}
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('toc.filterPlaceholder')}
            aria-label={t('toc.filterPlaceholder')}
            className={cn(
              'w-full rounded-md py-1.5 pl-8 pr-7 text-sm',
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

        <nav aria-label={t('toc.label')} className="text-sm">
          <NavItem to="/examples" label={t('toc.overview')} end />

          {filteredGroups.length === 0 ? (
            <p className="mt-4 px-3 text-xs text-[var(--color-muted-foreground)]">
              {t('toc.noResults')}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-4">
              {filteredGroups.map((group) => (
                <li key={group.label}>
                  <p className="mb-1.5 flex items-center gap-1.5 px-3 text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                    {group.label}
                    <span className="rounded-full bg-[var(--color-muted)] px-1.5 text-[10px] font-normal">
                      {group.items.length}
                    </span>
                  </p>
                  <ul className="flex flex-col gap-0.5">
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
          'block rounded-md px-3 py-1.5 transition-colors duration-[var(--duration-fast)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
          'text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]',
          isActive &&
            'bg-[var(--color-primary)] font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground)]'
        )
      }
    >
      {label}
    </NavLink>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { ExamplesSidebar };
