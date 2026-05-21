import type { ReactNode } from 'react';

import { useI18n } from '../../theme/i18n';
import type { SidebarController } from '../../hooks/useSidebarMode';
import type { SidebarSectionSpec } from './types';
import { ChevronRightIcon, PinIcon } from './icons';

/* ============================================================
 * RAIL — the slim 48px column shown in collapsed/peeking state.
 * ============================================================ */

interface RailProps {
  controller: SidebarController;
  sections: SidebarSectionSpec[];
  railClassName: string;
}

export function Rail({ controller, sections, railClassName }: RailProps) {
  const { t } = useI18n();
  const { triggerProps, openPeekNow, isPeeking } = controller;

  return (
    <div
      {...triggerProps}
      // `eikon-rail-glow` paints the slow vertical brightness
      // sweep on the rail's right edge (slower than the workbench
      // ring, smooth opacity tween on hover via --ease-silk).
      // `eikon-rail-magnet` does the silky bg + box-shadow swell
      // on hover (360ms with --ease-silk). data-active mirrors
      // the peek state so the rail keeps its lit treatment while
      // the panel is out.
      data-active={isPeeking || undefined}
      className={`eikon-rail-glow eikon-rail-magnet relative flex h-full w-full flex-col items-center justify-between border-r border-[var(--border-1)] bg-[var(--surface-0)]/60 py-3 backdrop-blur-sm ${railClassName}`}
    >
      {/* Top tag — chevron expand button. Uses .eikon-rail-icon
          for the silky 280ms hover transition (bg + color), and
          .eikon-rail-icon-glyph on the inner SVG wrapper so the
          icon scales up on hover with its own 320ms tween. */}
      <RailButton
        ariaLabel={t('sidebar.expand')}
        title={`${t('sidebar.expand')}  [ `}
        onClick={openPeekNow}
      >
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </RailButton>

      {/* Icon column — one button per section. Each is a
          quick-jump: clicking opens peek AND scrolls its section
          into view in the panel. */}
      <nav
        aria-label={t('sidebar.sectionsNav')}
        className="flex flex-col items-center gap-1"
      >
        {sections.map((section) => (
          <RailIconButton
            key={section.id}
            section={section}
            controller={controller}
          />
        ))}
      </nav>

      {/* Pin shortcut at bottom — same icon as the in-panel pin,
          for visual continuity. Hovering it also opens the peek
          (so users discover what "the thing with the pin" is). */}
      <RailButton
        ariaLabel={t('sidebar.openAndPin')}
        title={`${t('sidebar.openAndPin')}  [ `}
        onPointerEnter={openPeekNow}
        onClick={controller.togglePin}
      >
        <PinIcon className="h-3.5 w-3.5" />
      </RailButton>
    </div>
  );
}

/** Small button shared by the rail's chevron + pin slots. Encapsulates
 *  the silky transition classes (`.eikon-rail-icon` for the wrapper,
 *  `.eikon-rail-icon-glyph` for the inner SVG scale tween) so all
 *  three rail affordances feel identical on hover. */
export function RailButton({
  ariaLabel,
  title,
  onClick,
  onPointerEnter,
  children,
}: {
  ariaLabel: string;
  title: string;
  onClick?: () => void;
  onPointerEnter?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      className="eikon-rail-icon flex h-7 w-7 items-center justify-center rounded-md text-[var(--fg-4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
    >
      <span className="eikon-rail-icon-glyph pointer-events-none">
        {children}
      </span>
    </button>
  );
}

interface RailIconButtonProps {
  section: SidebarSectionSpec;
  controller: SidebarController;
}

export function RailIconButton({ section, controller }: RailIconButtonProps) {
  const { t } = useI18n();
  const { openPeekNow } = controller;

  return (
    <button
      type="button"
      aria-label={`${t('sidebar.jumpTo')} ${section.title}`}
      title={section.title}
      aria-controls={section.anchorId ?? section.id}
      onClick={() => {
        openPeekNow();
        requestAnimationFrame(() => {
          const target = document.getElementById(section.anchorId ?? section.id);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }}
      className="eikon-rail-icon relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--fg-4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
    >
      <span className="eikon-rail-icon-glyph pointer-events-none">
        {section.icon}
      </span>
    </button>
  );
}
