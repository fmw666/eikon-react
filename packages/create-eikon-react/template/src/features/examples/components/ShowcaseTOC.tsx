/**
 * @file ShowcaseTOC.tsx
 * @description Sticky table-of-contents sidebar for the examples index page.
 *
 * Tracks the section currently in view using an IntersectionObserver and
 * highlights the matching link. Falls back to an unhighlighted list under
 * SSR (no `IntersectionObserver`) and when the API is unsupported.
 *
 * Each item can either be an in-page anchor (`type: 'anchor'`) or a link
 * to a standalone showcase route (`type: 'route'`). Standalone routes
 * open in-place — the consumer is expected to point react-router at
 * them rather than rely on the browser's <a href> fallback.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Core-related Libraries ---
import { NavLink } from 'react-router-dom';

// --- Third-party Libraries ---
import { ExternalLink } from 'lucide-react';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';

// =================================================================================================
// Types
// =================================================================================================

interface TOCAnchorItem {
  type: 'anchor';
  /** Matches the `anchor` prop of the corresponding ShowcaseSection. */
  id: string;
  label: string;
}

interface TOCRouteItem {
  type: 'route';
  /** Absolute path (e.g. `/examples/toaster`). */
  to: string;
  label: string;
}

type TOCItem = TOCAnchorItem | TOCRouteItem;

interface TOCGroup {
  label: string;
  items: TOCItem[];
}

interface ShowcaseTOCProps {
  groups: TOCGroup[];
  /** The accessible label for the nav (announced by screen readers). */
  ariaLabel: string;
}

// =================================================================================================
// Component
// =================================================================================================

function ShowcaseTOC({ groups, ariaLabel }: ShowcaseTOCProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Collect the anchor ids once so the observer's root margin and
  // selector logic is stable across renders.
  const anchorIds = React.useMemo(() => {
    const out: string[] = [];
    for (const group of groups) {
      for (const item of group.items) {
        if (item.type === 'anchor') out.push(item.id);
      }
    }
    return out;
  }, [groups]);

  React.useEffect(() => {
    if (
      anchorIds.length === 0 ||
      typeof window === 'undefined' ||
      typeof window.IntersectionObserver !== 'function'
    ) {
      return;
    }

    // Pick whichever section is "most visible" near the top of the
    // viewport. The negative bottom rootMargin treats the bottom
    // ~60% of the viewport as out-of-band so the active link doesn't
    // flicker as the user scrolls into a section.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: [0.1, 0.5, 1],
      }
    );

    for (const id of anchorIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [anchorIds]);

  return (
    <nav aria-label={ariaLabel} className="text-sm">
      <ul className="flex flex-col gap-4">
        {groups.map((group) => (
          <li key={group.label}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5 border-l border-[var(--color-border)]">
              {group.items.map((item) =>
                item.type === 'anchor' ? (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className={cn(
                        'block border-l-2 border-transparent px-3 py-1 -ml-px transition-colors',
                        'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                        activeId === item.id &&
                          'border-[var(--color-primary)] font-medium text-[var(--color-foreground)]'
                      )}
                    >
                      {item.label}
                    </a>
                  </li>
                ) : (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-1.5 border-l-2 border-transparent px-3 py-1 -ml-px transition-colors',
                          'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                          isActive &&
                            'border-[var(--color-primary)] font-medium text-[var(--color-foreground)]'
                        )
                      }
                    >
                      <span>{item.label}</span>
                      <ExternalLink
                        aria-hidden="true"
                        className="h-3 w-3 opacity-60"
                      />
                    </NavLink>
                  </li>
                )
              )}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { ShowcaseTOC };
export type { ShowcaseTOCProps, TOCGroup, TOCItem };
