import { useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '../../theme/i18n';
import type { SidebarController } from '../../hooks/useSidebarMode';
import type { SidebarSectionSpec } from './types';
import { RAIL_WIDTH_PX } from './types';
import { Rail } from './Rail';
import { PanelContent } from './PanelContent';

/* ============================================================
 * DESKTOP COLLAPSIBLE SIDEBAR — single-surface architecture.
 *
 * One panel DOM element persists across all state transitions.
 * A separate width-spacer div handles layout pushing.
 *
 * Phases: hidden → entering → peeking → absorbing → pinned
 *                                                  ↓
 *         hidden ← exiting ← releasing ←──────────┘
 * ============================================================ */

interface DesktopProps {
  controller: SidebarController;
  ariaLabel: string;
  sections: SidebarSectionSpec[];
  panelClassName: string;
  railClassName: string;
}

type PanelPhase =
  | 'hidden'
  | 'entering'
  | 'peeking'
  | 'absorbing'
  | 'pinned'
  | 'releasing'
  | 'exiting';

const ENTER_DURATION = 380;
const EXIT_DURATION = 260;
const WIDTH_DURATION = 420;

export function DesktopCollapsibleSidebar({
  controller,
  ariaLabel,
  sections,
  panelClassName,
  railClassName,
}: DesktopProps) {
  const { isPinned, isPeeking } = controller;

  const [phase, setPhase] = useState<PanelPhase>(
    isPinned ? 'pinned' : isPeeking ? 'peeking' : 'hidden'
  );
  const timerRef = useRef<number | null>(null);
  const prevPinnedRef = useRef(isPinned);
  const prevPeekingRef = useRef(isPeeking);

  useEffect(() => {
    const wasPinned = prevPinnedRef.current;
    const wasPeeking = prevPeekingRef.current;
    prevPinnedRef.current = isPinned;
    prevPeekingRef.current = isPeeking;

    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    clearTimer();

    if (isPinned) {
      if (phase === 'pinned') return;
      if (phase === 'hidden') {
        setPhase('pinned');
      } else {
        setPhase('absorbing');
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          setPhase('pinned');
        }, WIDTH_DURATION);
      }
    } else if (isPeeking) {
      if (phase === 'hidden' || phase === 'exiting') {
        setPhase('entering');
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          setPhase('peeking');
        }, ENTER_DURATION);
      } else {
        setPhase('peeking');
      }
    } else {
      if (wasPinned || phase === 'pinned') {
        setPhase('releasing');
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          setPhase('exiting');
          timerRef.current = window.setTimeout(() => {
            timerRef.current = null;
            setPhase('hidden');
          }, EXIT_DURATION);
        }, WIDTH_DURATION);
      } else if (phase === 'releasing') {
        // let the chain continue
      } else if (wasPeeking || phase === 'entering' || phase === 'peeking' || phase === 'absorbing') {
        setPhase('exiting');
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          setPhase('hidden');
        }, EXIT_DURATION);
      } else {
        setPhase('hidden');
      }
    }

    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPinned, isPeeking]);

  const { wrapperWide, showRail, showPanel, panelAtOrigin, panelIsFloating } =
    useMemo(() => {
      const wide = phase === 'pinned' || phase === 'absorbing';
      return {
        wrapperWide: wide,
        showRail: !wide,
        showPanel: phase !== 'hidden',
        panelAtOrigin: phase === 'pinned' || phase === 'absorbing' || phase === 'releasing',
        panelIsFloating: phase !== 'pinned' && phase !== 'absorbing',
      };
    }, [phase]);

  const rootWidth = wrapperWide
    ? 'clamp(340px, 24vw, 440px)'
    : `${RAIL_WIDTH_PX}px`;

  return (
    <>
      <div
        aria-label={ariaLabel}
        className="eikon-sidebar-width relative flex shrink-0 overflow-hidden bg-[var(--surface-0)]"
        style={{ width: rootWidth }}
      >
        <div
          className="eikon-rail-reveal absolute inset-0 z-10"
          data-visible={showRail || undefined}
        >
          <Rail
            controller={controller}
            railClassName={railClassName}
          />
        </div>
      </div>

      {showPanel && (
        <SidebarPanel
          phase={phase}
          atOrigin={panelAtOrigin}
          floating={panelIsFloating}
          controller={controller}
          sections={sections}
          panelClassName={panelClassName}
        />
      )}
    </>
  );
}

/* ============================================================
 * SIDEBAR PANEL — single persistent surface.
 * Position driven by `atOrigin` (left:0 vs left:32px).
 * Entrance/exit via CSS animations; mid-state via transitions.
 * ============================================================ */

function SidebarPanel({
  phase,
  atOrigin,
  floating,
  controller,
  sections,
  panelClassName,
}: {
  phase: PanelPhase;
  atOrigin: boolean;
  floating: boolean;
  controller: SidebarController;
  sections: SidebarSectionSpec[];
  panelClassName: string;
}) {
  const { t } = useI18n();
  const { panelProps, closePeekNow } = controller;
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (phase !== 'entering' && phase !== 'peeking') return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.('.eikon-rail-slim')) return;
      closePeekNow();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [phase, closePeekNow]);

  const animClass =
    phase === 'exiting'
      ? 'eikon-peek-out'
      : phase === 'releasing'
        ? 'eikon-peek-hold'
        : 'eikon-peek-in';

  return (
    <div
      ref={panelRef}
      {...panelProps}
      data-state={phase}
      className={`${animClass} eikon-sidebar-panel absolute top-0 z-30 h-full border-r border-[var(--border-1)] bg-[var(--surface-0)]/95 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.6),0_8px_24px_-8px_rgb(15_23_42/0.4)] ${panelClassName}`}
      style={{ left: atOrigin ? '0px' : `${RAIL_WIDTH_PX}px` }}
      role="region"
      aria-label={t('sidebar.controlsLabel')}
    >
      <PanelContent
        controller={controller}
        sections={sections}
        floating={floating}
      />
    </div>
  );
}
