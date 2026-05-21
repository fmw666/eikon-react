import { useState } from 'react';

import { useI18n } from '../../theme/i18n';
import type { SidebarController } from '../../hooks/useSidebarMode';
import type { SidebarSectionSpec } from './types';
import { SlidersIcon, PinIcon, ChevronLeftIcon, CloseIcon } from './icons';
import { SidebarSection } from './MobileSidebar';

/* ============================================================
 * PANEL CONTENT — header strip + scrollable sections, shared by
 * both PinnedPanel and PeekPanel so the visuals stay identical.
 * ============================================================ */

interface PanelContentProps {
  controller: SidebarController;
  sections: SidebarSectionSpec[];
  /** Whether this content is rendered inside the floating peek
   *  panel (true) or the pinned in-layout panel (false). Drives
   *  the close button (only shown when floating) and the collapse
   *  button (only shown when pinned). */
  floating: boolean;
}

export function PanelContent({ controller, sections, floating }: PanelContentProps) {
  const { t } = useI18n();
  const { isPinned, togglePin, unpin, closePeekNow } = controller;

  return (
    <>
      {/* Header strip — title + action buttons. Pin toggle is the
          star: clicking it from peek state promotes the panel to
          pinned (sidebar stays open and starts participating in
          layout); clicking it from pinned state demotes back to
          collapsed. Esc / [ keyboard shortcuts work in parallel.
          The pin icon uses `.eikon-pin-icon[data-pinned]` for the
          silky 480ms rotation tween (longer than the bg fade — the
          icon keeps turning after the colour settles, which reads
          as "the action committed"). */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-1)]/60 px-4 py-3 lg:px-5">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-3)]">
          <SlidersIcon className="h-3.5 w-3.5" />
          <span>{t('sidebar.controlsLabel')}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={isPinned ? t('sidebar.unpin') : t('sidebar.pin')}
            aria-pressed={isPinned}
            title={`${isPinned ? t('sidebar.unpin') : t('sidebar.pin')}  [ `}
            onClick={togglePin}
            className={`eikon-rail-icon flex h-7 w-7 items-center justify-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${
              isPinned ? 'text-brand-300' : 'text-[var(--fg-4)]'
            }`}
          >
            <PinIcon
              className="eikon-pin-icon h-3.5 w-3.5"
              data-pinned={isPinned ? 'true' : 'false'}
            />
          </button>
          {floating && (
            <button
              type="button"
              aria-label={t('sidebar.close')}
              title={t('sidebar.close')}
              onClick={closePeekNow}
              className="eikon-rail-icon flex h-7 w-7 items-center justify-center rounded-md text-[var(--fg-4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          )}
          {isPinned && (
            <button
              type="button"
              aria-label={t('sidebar.collapse')}
              title={`${t('sidebar.collapse')}  [ `}
              onClick={unpin}
              className="eikon-rail-icon flex h-7 w-7 items-center justify-center rounded-md text-[var(--fg-4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content area — same overflow behaviour as the
          old static sidebar, so long content (params on a tall
          variant) scrolls internally rather than pushing the page. */}
      <div className="flex h-[calc(100%-49px)] min-h-0 flex-col gap-5 overflow-y-auto p-4 sm:p-5">
        {sections.map((section) => (
          <SidebarSection key={section.id} section={section} />
        ))}
      </div>
    </>
  );
}
