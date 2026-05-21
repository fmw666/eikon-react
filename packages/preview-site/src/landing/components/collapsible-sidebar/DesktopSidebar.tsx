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

  // Width contract:
  //   - pinned   : full sidebar width participates in layout, no
  //                rail (the open panel replaces it).
  //   - else     : rail width participates in layout; peek panel
  //                floats absolutely so opening it never shifts the
  //                preview pane.
  //
  // The width is driven entirely from inline `style` (Tailwind JIT
  // can't statically see runtime-constructed `lg:w-[...]` strings),
  // so we keep the className purely structural and let `style.width`
  // be the single source of truth. The `transition-[width]` class
  // still animates the change because inline-style width changes
  // also trigger CSS transitions when a matching transition is set.
  const rootWidth = isPinned
    ? 'clamp(340px, 24vw, 440px)'
    : `${RAIL_WIDTH_PX}px`;

  return (
    <div
      aria-label={ariaLabel}
      // `relative` is for the peek panel's `position: absolute`
      // child. `shrink-0` keeps the rail/panel from being squashed
      // when the playground sibling is greedy.
      //
      // Width transition: `.eikon-sidebar-width` uses the silky
      // `--ease-glide` curve over 420ms — the dominant tween in
      // the whole collapse experience. Tuning this curve / duration
      // changes the feel of every pin/unpin action.
      //
      // Overflow contract:
      //   - peeking : visible — the peek panel is absolutely
      //               positioned at `left: 48px` and extends well
      //               past the wrapper's 48px width. We *also*
      //               need it visible during the EXIT animation
      //               (the panel translates back out by 10px and
      //               must not be clipped at the rail edge), which
      //               is why the condition checks "any panel
      //               present", not just "currently peeking".
      //   - else    : hidden — during the collapsed↔pinned width
      //               transition (420ms), inner content briefly
      //               exists at a different intrinsic width than
      //               the animating wrapper; clipping prevents the
      //               "overflowing into the playground" flash.
      className={`eikon-sidebar-width relative flex shrink-0 ${
        !isPinned ? 'overflow-visible' : 'overflow-hidden'
      }`}
      style={{ width: rootWidth }}
    >
      {/* RAIL — present only when not pinned. Acts as the always-on
          "magnetic edge" affordance: hovering it opens peek,
          clicking the body or any icon opens peek instantly. */}
      {!isPinned && (
        <Rail
          controller={controller}
          sections={sections}
          railClassName={railClassName}
        />
      )}

      {/* PINNED PANEL — participates in layout when pinned, no
          enter/exit animation (the wrapper width transition
          carries the visual change). Rendered separately from the
          PeekPanel so the two never collide on the same key. */}
      {isPinned && (
        <PinnedPanel
          controller={controller}
          sections={sections}
          panelClassName={panelClassName}
        />
      )}

      {/* PEEK PANEL — floats above the playground, owns its own
          enter/exit lifecycle (slides + fades in over 380ms with
          --ease-glide, slides + fades out over 260ms with
          --ease-silk). Stays mounted through the exit animation
          before unmounting — this is the single biggest
          "silkiness" contributor in the whole component. */}
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
