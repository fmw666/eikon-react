/**
 * @file ExamplesSectionPage.tsx
 * @description Renders ONE inline component showcase as a standalone
 * sub-page, resolved from the `:section` route param against the
 * `sections.tsx` registry. Reached via the sidebar links under the
 * `/examples` shell (e.g. `/examples/button`).
 *
 * Unknown slugs fall back to a friendly "pick something from the sidebar"
 * message instead of a hard 404, since the shell (and its nav) is still
 * mounted around this Outlet.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

// --- Relative Imports ---
import { ShowcasePageHeader } from '../components/ShowcasePageHeader';
import { findSection } from '../components/exampleSections';

// =================================================================================================
// Component
// =================================================================================================

function ExamplesSectionPage() {
  const { t } = useTranslation('examples');
  const { section } = useParams<{ section: string }>();
  const entry = findSection(section);

  if (!entry) {
    return (
      <div className="flex flex-col gap-4">
        <ShowcasePageHeader
          title={t('meta.title')}
          subtitle={t('meta.unknownSection')}
        />
      </div>
    );
  }

  const Demo = entry.Component;

  return (
    <div className="flex flex-col gap-8">
      <ShowcasePageHeader
        title={t(`sections.${entry.slug}.title`)}
        subtitle={t(`sections.${entry.slug}.description`)}
      />
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
        <Demo />
      </div>
    </div>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { ExamplesSectionPage };
