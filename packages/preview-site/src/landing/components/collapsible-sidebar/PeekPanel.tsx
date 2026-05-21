import { useEffect, useRef, useState } from 'react';

import { useI18n } from '../../theme/i18n';
import type { SidebarController } from '../../hooks/useSidebarMode';
import type { SidebarSectionSpec } from './types';
import { RAIL_WIDTH_PX } from './types';
import { PanelContent } from './PanelContent';

/* ============================================================
 * PEEK PANEL — floats above the playground while peeking,
 * owns its own enter/exit lifecycle via a 4-state machine:
 *
 *     closed ──visible─→ opening ──380ms─→ open
 *        ▲                                   │
 *        │                                   │ ¬visible
 *      260ms                                 ▼
 *        └──────── closing ←──────────── (still open in DOM)
 *
 * The "closing" phase keeps the panel mounted while
 * `.eikon-peek-out` runs (slide + fade back to the rail edge),
 * then unmounts. A re-open mid-close cancels the close timer
 * and snaps back to `open` without re-triggering the entrance
 * animation — important for jittery cursors near the trigger
 * boundary, where without this you'd see in/out flickering.
 * ============================================================ */

export type PeekPhase = 'closed' | 'opening' | 'open' | 'closing';

/** Must match the keyframe duration in `styles/index.css`
 *  (`.eikon-peek-in` → 380ms, `.eikon-peek-out` → 260ms). */
export const PEEK_ENTER_DURATION_MS = 380;
export const PEEK_EXIT_DURATION_MS = 260;

interface PeekPanelProps {
  visible: boolean;
  controller: SidebarController;
  sections: SidebarSectionSpec[];
  panelClassName: string;
}

export function PeekPanel({
  visible,
  controller,
  sections,
  panelClassName,
}: PeekPanelProps) {
  const { t } = useI18n();
  const { panelProps, closePeekNow } = controller;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<PeekPhase>(visible ? 'open' : 'closed');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (visible) {
      // Re-opening while still closing → snap back to `open`
      // without replaying the entrance (avoids visible "ghost"
      // animation when cursor crosses the trigger boundary
      // multiple times quickly).
      if (phase === 'closed') {
        setPhase('opening');
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          setPhase('open');
        }, PEEK_ENTER_DURATION_MS);
      } else if (phase === 'closing') {
        setPhase('open');
      }
    } else {
      // Going invisible — start exit animation, then unmount
      // when it completes. If we were still in the entrance
      // animation, cut to "closing" immediately; the eye accepts
      // a fade-out from any mid-entrance state.
      if (phase === 'open' || phase === 'opening') {
        setPhase('closing');
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          setPhase('closed');
        }, PEEK_EXIT_DURATION_MS);
      }
    }
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // We intentionally depend only on `visible` — re-running on
    // phase changes would create a loop (the effect itself sets
    // phase). The `phase` snapshot above is read at the moment
    // `visible` flips, which is exactly the transition we want
    // to drive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Click-away — applies only while the peek is visible (open OR
  // closing). During the closing animation we still want a click
  // outside to be a no-op rather than re-triggering anything.
  useEffect(() => {
    if (phase === 'closed' || phase === 'closing') return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      // Don't dismiss when the user clicked the rail itself —
      // that's how they just opened us in the first place.
      if ((target as HTMLElement).closest?.('.eikon-rail-glow')) return;
      closePeekNow();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [phase, closePeekNow]);

  if (phase === 'closed') return null;

  // Pick the animation class for the current phase. `opening` and
  // `open` both use the enter class (the animation has `both` fill
  // mode, so when it finishes the end keyframe stays applied — we
  // can leave the class on for `open` without re-triggering).
  const animationClass =
    phase === 'closing' ? 'eikon-peek-out' : 'eikon-peek-in';

  return (
    <div
      ref={panelRef}
      {...panelProps}
      data-state={phase}
      className={`${animationClass} absolute top-0 z-30 h-full border border-l-0 border-[var(--border-1)] bg-[var(--surface-0)]/85 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.6),0_8px_24px_-8px_rgb(15_23_42/0.4)] backdrop-saturate-150 ${panelClassName}`}
      style={{
        left: `${RAIL_WIDTH_PX}px`,
        width: 'clamp(320px, 24vw, 420px)',
        // backdrop-filter is animated by the keyframes; we leave
        // the inline value undefined here so the keyframe's
        // animated value drives painting. The end keyframe applies
        // permanently (animation-fill-mode: both) so the open
        // panel stays blurred after the entrance finishes.
      }}
      role="dialog"
      aria-modal={false}
      aria-label={t('sidebar.controlsLabel')}
    >
      <PanelContent controller={controller} sections={sections} floating />
    </div>
  );
}
