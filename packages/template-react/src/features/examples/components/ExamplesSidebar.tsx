/**
 * @file ExamplesSidebar.tsx
 * @description Persistent categorised left-nav for the examples shell.
 *
 * Unlike the old in-page table-of-contents (which scroll-spied anchors on
 * a single long page), this is true ROUTE navigation: every item is a
 * `<NavLink>` to its own `/examples/<slug>` sub-page, and the active link
 * is driven by the router's match state. The inline-component groups are
 * generated from the `sections.tsx` registry; the standalone showcases
 * (Toaster, Dialog, …) and Performance are appended as route links.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

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

  const groups: NavGroup[] = [
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
  ];

  return (
    <nav aria-label={t('toc.label')} className="text-sm">
      <NavItem to="/examples" label={t('toc.overview')} end />
      <ul className="mt-4 flex flex-col gap-4">
        {groups.map((group) => (
          <li key={group.label}>
            <p className="mb-1.5 px-3 text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {group.label}
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
    </nav>
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
