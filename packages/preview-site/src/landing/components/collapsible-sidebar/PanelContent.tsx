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
      <div className="relative flex items-center justify-between gap-2 px-4 py-3 lg:px-5">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-3)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-400/60 shadow-[0_0_6px_var(--accent-glow)]" />
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
          <div className="relative h-7 w-7">
            <button
              type="button"
              aria-label={t('sidebar.close')}
              title={t('sidebar.close')}
              onClick={closePeekNow}
              className={`eikon-rail-icon eikon-panel-btn-fade absolute inset-0 flex items-center justify-center rounded-md text-[var(--fg-4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${
                floating ? '' : 'opacity-0 pointer-events-none'
              }`}
              tabIndex={floating ? 0 : -1}
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={t('sidebar.collapse')}
              title={`${t('sidebar.collapse')}  [ `}
              onClick={unpin}
              className={`eikon-rail-icon eikon-panel-btn-fade absolute inset-0 flex items-center justify-center rounded-md text-[var(--fg-4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${
                isPinned ? '' : 'opacity-0 pointer-events-none'
              }`}
              tabIndex={isPinned ? 0 : -1}
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <span
          aria-hidden="true"
          className="absolute inset-x-4 bottom-0 h-px lg:inset-x-5"
          style={{
            background:
              'linear-gradient(90deg, transparent, var(--border-1) 30%, var(--border-1) 70%, transparent)',
          }}
        />
      </div>

      <div className="flex h-[calc(100%-49px)] min-h-0 flex-col gap-5 p-4 sm:p-5">
        {sections.map((section) => (
          <SidebarSection key={section.id} section={section} />
        ))}
      </div>
    </>
  );
}
