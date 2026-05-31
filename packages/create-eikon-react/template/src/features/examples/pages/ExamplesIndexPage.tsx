/**
 * @file ExamplesIndexPage.tsx
 * @description Overview landing for the `/examples` shell (the index
 * Outlet). Renders the dev-only hero plus a categorised grid of cards,
 * each linking to a component's own sub-page (`/examples/<slug>`).
 *
 * The persistent navigation lives in `ExamplesLayout`'s sidebar — this
 * page is just the welcome surface shown before the visitor picks a
 * component, so it stays light and link-forward.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';

// --- Relative Imports ---
import { ShowcasePageHeader } from '../components/ShowcasePageHeader';
import { GROUP_ORDER, sectionsByGroup } from '../components/exampleSections';

// =================================================================================================
// Component
// =================================================================================================

function ExamplesIndexPage() {
  const { t } = useTranslation('examples');

  return (
    <div className="flex flex-col gap-8">
      <ShowcasePageHeader title={t('meta.title')} subtitle={t('meta.subtitle')} />

      <p className="text-sm text-[var(--color-muted-foreground)]">
        {t('overview.pick')}
      </p>

      <div className="flex flex-col gap-10">
        {GROUP_ORDER.map((group) => {
          const items = sectionsByGroup(group);
          return (
            <section key={group} className="flex flex-col gap-3">
              <h2 className="flex items-baseline gap-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                {t(`toc.${group}`)}
                <span className="rounded-full bg-[var(--color-muted)] px-1.5 text-[10px] font-normal text-[var(--color-muted-foreground)]">
                  {items.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((s) => (
                  <Link
                    key={s.slug}
                    to={`/examples/${s.slug}`}
                    className={cn(
                      'group flex flex-col gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm',
                      'transition-colors duration-[var(--duration-fast)] hover:border-[var(--color-primary)]'
                    )}
                  >
                    <span className="text-sm font-medium text-[var(--color-card-foreground)] transition-colors group-hover:text-[var(--color-primary)]">
                      {t(`sections.${s.slug}.title`)}
                    </span>
                    <span className="line-clamp-2 text-xs text-[var(--color-muted-foreground)]">
                      {t(`sections.${s.slug}.description`)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { ExamplesIndexPage };
