/**
 * @file ExamplesIndexPage.tsx
 * @description Route-level component for `/examples`.
 *
 * Layout:
 *
 *   - Two-column grid on `md+` viewports: sticky TOC on the right
 *     (240px), long-form content on the left.
 *   - On smaller viewports the TOC collapses below the heading and
 *     loses its sticky positioning so it doesn't overlap content.
 *
 * Section ordering follows the TOC groups: UI primitives first
 * (Button → Card → Tabs), interaction patterns next (Theme → I18n →
 * Animation), then the route links for the standalone showcases.
 *
 * Each inline section is a small component under `../components/inline/`
 * so an AI agent can extend ONE section without rewriting the page.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core-related Libraries ---
// @eikon:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @eikon:feature(i18n) end

// --- Relative Imports ---
import { AnimationShowcase } from '../components/inline/AnimationShowcase';
import { ButtonShowcase } from '../components/inline/ButtonShowcase';
import { CardShowcase } from '../components/inline/CardShowcase';
// @eikon:feature(i18n) begin
import { I18nShowcase } from '../components/inline/I18nShowcase';
// @eikon:feature(i18n) end
import { TabsShowcase } from '../components/inline/TabsShowcase';
import { ThemeShowcase } from '../components/inline/ThemeShowcase';
import { ShowcasePageHeader } from '../components/ShowcasePageHeader';
import { ShowcaseSection } from '../components/ShowcaseSection';
import { ShowcaseTOC, type TOCGroup } from '../components/ShowcaseTOC';

// =================================================================================================
// Component
// =================================================================================================

function ExamplesIndexPage() {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation('examples');
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (_k: string, opts?: { defaultValue?: string }) =>
  //   opts?.defaultValue ?? _k;
  // @eikon:feature(i18n:fallback) end

  const tocGroups: TOCGroup[] = [
    {
      label: t('toc.uiPrimitives'),
      items: [
        { type: 'anchor', id: 'button', label: t('sections.button.title') },
        { type: 'anchor', id: 'card', label: t('sections.card.title') },
        { type: 'anchor', id: 'tabs', label: t('sections.tabs.title') },
      ],
    },
    {
      label: t('toc.label'),
      items: [
        { type: 'anchor', id: 'theme', label: t('sections.theme.title') },
        // @eikon:feature(i18n) begin
        { type: 'anchor', id: 'i18n', label: t('sections.i18n.title') },
        // @eikon:feature(i18n) end
        { type: 'anchor', id: 'animation', label: t('sections.animation.title') },
        { type: 'route', to: '/examples/toaster', label: t('pages.toaster.title') },
        { type: 'route', to: '/examples/dialog', label: t('pages.dialog.title') },
        { type: 'route', to: '/examples/motion', label: t('pages.motion.title') },
      ],
    },
    {
      label: t('toc.performance'),
      items: [
        {
          type: 'route',
          to: '/examples/performance',
          label: t('pages.performance.title'),
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <ShowcasePageHeader title={t('meta.title')} subtitle={t('meta.subtitle')} />

      {/*
        md:grid-cols-[1fr_220px] keeps the TOC narrow + the content column
        flexible. On small screens we drop to a single column with the TOC
        first (so it's discoverable on mobile) and unset the sticky.
      */}
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_220px]">
        <main className="flex flex-col gap-12">
          <ShowcaseSection
            anchor="button"
            eyebrow={t('toc.uiPrimitives')}
            title={t('sections.button.title')}
            description={t('sections.button.description')}
          >
            <ButtonShowcase />
          </ShowcaseSection>

          <ShowcaseSection
            anchor="card"
            eyebrow={t('toc.uiPrimitives')}
            title={t('sections.card.title')}
            description={t('sections.card.description')}
          >
            <CardShowcase />
          </ShowcaseSection>

          <ShowcaseSection
            anchor="tabs"
            eyebrow={t('toc.uiPrimitives')}
            title={t('sections.tabs.title')}
            description={t('sections.tabs.description')}
          >
            <TabsShowcase />
          </ShowcaseSection>

          <ShowcaseSection
            anchor="theme"
            eyebrow={t('toc.label')}
            title={t('sections.theme.title')}
            description={t('sections.theme.description')}
          >
            <ThemeShowcase />
          </ShowcaseSection>

          {/* @eikon:feature(i18n) begin */}
          <ShowcaseSection
            anchor="i18n"
            eyebrow={t('toc.label')}
            title={t('sections.i18n.title')}
            description={t('sections.i18n.description')}
          >
            <I18nShowcase />
          </ShowcaseSection>
          {/* @eikon:feature(i18n) end */}

          <ShowcaseSection
            anchor="animation"
            eyebrow={t('toc.label')}
            title={t('sections.animation.title')}
            description={t('sections.animation.description')}
          >
            <AnimationShowcase />
          </ShowcaseSection>
        </main>

        {/*
          The aside is sticky from `md+` only. Below that breakpoint we
          let it scroll with the content so it doesn't crowd the mobile
          viewport. `self-start` keeps the box height tight against
          its own content rather than stretching to fill the row.
        */}
        <aside className="order-first self-start md:order-last md:sticky md:top-20">
          <ShowcaseTOC groups={tocGroups} ariaLabel={t('toc.label')} />
        </aside>
      </div>
    </div>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { ExamplesIndexPage };
