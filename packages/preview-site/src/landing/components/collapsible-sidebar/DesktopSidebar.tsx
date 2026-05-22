import { useI18n } from '../../theme/i18n';
import type { SidebarController } from '../../hooks/useSidebarMode';
import type { SidebarSectionSpec } from './types';
import { RAIL_WIDTH_PX } from './types';
import { Rail } from './Rail';
import { PeekPanel } from './PeekPanel';
import { PanelContent } from './PanelContent';

/* ============================================================
 * DESKTOP COLLAPSIBLE SIDEBAR — three-state panel.
 * ============================================================ */

interface DesktopProps {
  controller: SidebarController;
  ariaLabel: string;
  sections: SidebarSectionSpec[];
  panelClassName: string;
  railClassName: string;
}

export function DesktopCollapsibleSidebar({
  controller,
  ariaLabel,
  sections,
  panelClassName,
  railClassName,
}: DesktopProps) {
  const { isPinned, isPeeking } = controller;

  const rootWidth = isPinned
    ? 'clamp(340px, 24vw, 440px)'
    : `${RAIL_WIDTH_PX}px`;

  return (
    <div
      aria-label={ariaLabel}
      className={`eikon-sidebar-width relative flex shrink-0 bg-[var(--surface-0)] ${
        !isPinned ? 'overflow-visible' : 'overflow-hidden'
      }`}
      style={{ width: rootWidth }}
    >
      {!isPinned && (
        <Rail
          controller={controller}
          sections={sections}
          railClassName={railClassName}
        />
      )}

      {isPinned && (
        <PinnedPanel
          controller={controller}
          sections={sections}
          panelClassName={panelClassName}
        />
      )}

      <PeekPanel
        visible={isPeeking}
        controller={controller}
        sections={sections}
        panelClassName={panelClassName}
      />
    </div>
  );
}

/* ============================================================
 * PINNED PANEL — sits in layout, no animation, always visible
 * while `isPinned`. The wrapper's width transition carries the
 * visual change between pinned and collapsed.
 * ============================================================ */

interface PinnedPanelProps {
  controller: SidebarController;
  sections: SidebarSectionSpec[];
  panelClassName: string;
}

function PinnedPanel({
  controller,
  sections,
  panelClassName,
}: PinnedPanelProps) {
  const { t } = useI18n();
  return (
    <div
      className={`relative h-full w-full border-r border-[var(--border-1)] bg-[var(--surface-0)]/60 ${panelClassName}`}
      aria-label={t('sidebar.controlsLabel')}
    >
      <PanelContent controller={controller} sections={sections} floating={false} />
    </div>
  );
}
