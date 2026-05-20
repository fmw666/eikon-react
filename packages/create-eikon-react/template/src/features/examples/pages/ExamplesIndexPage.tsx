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
      label: t('toc.patterns'),
      items: [
        { type: 'anchor', id: 'theme', label: t('sections.theme.title') },
        // @eikon:feature(i18n) begin
        { type: 'anchor', id: 'i18n', label: t('sections.i18n.title') },
        // @eikon:feature(i18n) end
        { type: 'anchor', id: 'animation', label: t('sections.animation.title') },
        { type: 'route', to: '/examples/motion', label: t('pages.motion.title') },
      ],
    },
    {
      label: t('toc.modals'),
      items: [
        { type: 'route', to: '/examples/toaster', label: t('pages.toaster.title') },
        { type: 'route', to: '/examples/dialog', label: t('pages.dialog.title') },
        { type: 'route', to: '/examples/sheet', label: t('pages.sheet.title') },
        { type: 'route', to: '/examples/command', label: t('pages.command.title') },
        {
          type: 'route',
          to: '/examples/sign-in-modal',
          label: t('pages.signInModal.title'),
        },
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
        Two-column layout is gated by a CSS *container query* (`@2xl` on the
        named `examples` container) rather than a viewport media query, so
        the page degrades gracefully no matter what shell it ends up in.

        Why this matters in practice:
          - Wide layouts (Stacked / Sidebar / TopbarSidebar): the container
            is hundreds of pixels wide, `@2xl` (~672px) triggers, and we
            get the classic "content + sticky TOC" reading layout.
          - Narrow layouts (CenteredRootLayout's `max-w-md` ≈ 448px card,
            or any future modal / split-view embed): the container stays
            below `@2xl`, so we stay in a single comfortable column and
            the TOC drops to the top of the page instead of being shoved
            into a ~200px gutter where its labels would wrap to 3 lines.

        `min-w-0` on `<main>` is the standard grid-item escape hatch — CSS
        grid items default to `min-width: auto`, which is `min-content`,
        which would otherwise let a wide demo (e.g. the button matrix) push
        the column past the assigned `minmax(0,1fr)` track and break the
        layout. Setting `min-w-0` re-enables shrink behaviour.
      */}
      <div className="@container/examples">
        <div className="grid gap-8 @2xl/examples:grid-cols-[minmax(0,1fr)_220px]">
          <main className="flex min-w-0 flex-col gap-12">
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
            Until `@2xl/examples` kicks in, the aside sits at the top of the
            single-column flow (so the TOC is still discoverable in narrow
            shells); from `@2xl` upwards it docks to the right and goes
            sticky. `self-start` keeps its row-track height tight against
            its own content rather than stretching to match `<main>`.
          */}
          <aside className="order-first self-start @2xl/examples:order-last @2xl/examples:sticky @2xl/examples:top-20">
            <ShowcaseTOC groups={tocGroups} ariaLabel={t('toc.label')} />
          </aside>
        </div>
      </div>
    </div>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { ExamplesIndexPage };
