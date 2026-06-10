/**
 * @file useFooterSpotlightDesktop.ts
 * @description Desktop (pointer: fine) mouse-follow accent-glow halo for
 * the footer, plus the meadow easter-egg mask vars. Touch devices skip
 * this entirely — see {@link ./useFooterSpotlightTouch}.
 */

import { useEffect } from 'react';

import type { FooterSpotlightOptions } from './useFooterSpotlight.shared';

export function useFooterSpotlightDesktop({
  containerRef,
  spotlightRef,
  meadowRef,
}: FooterSpotlightOptions) {
  // Mouse-follow spotlight — GPU composite-only via transform.
  //
  // The spotlight is a fixed-size div with a static radial gradient
  // centred on itself. We move it with translate3d so the browser
  // only composites (no gradient recalculation, no repaint).
  //
  // Gated on `pointer: fine` — touch devices skip the effect entirely.
  //
  // The same handler drives the meadow easter-egg masks via CSS vars
  // on the meadow element (small area, acceptable repaint cost).
  useEffect(() => {
    const el = containerRef.current;
    const spot = spotlightRef.current;
    if (!el || !spot) return;
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function' ||
      !window.matchMedia('(pointer: fine)').matches
    ) {
      return;
    }
    let rect: DOMRect | null = null;
    let meadowRect: DOMRect | null = null;
    let rafId = 0;
    let scrollRafId = 0;
    let lastX = 0;
    let lastY = 0;

    const SPOT_HALF = 360;

    const updateRects = () => {
      rect = el.getBoundingClientRect();
      const meadowEl = meadowRef.current;
      if (meadowEl) meadowRect = meadowEl.getBoundingClientRect();
    };
    updateRects();
    spot.style.transform = `translate3d(${(rect!.width / 2) - SPOT_HALF}px,${(rect!.height / 2) - SPOT_HALF}px,0)`;

    const handleMove = (e: PointerEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        if (!rect) return;
        const localX = lastX - rect.left;
        const localY = lastY - rect.top;
        spot.style.transform = `translate3d(${localX - SPOT_HALF}px,${localY - SPOT_HALF}px,0)`;

        if (meadowRect) {
          const meadowEl = meadowRef.current;
          if (meadowEl) {
            meadowEl.style.setProperty(
              '--eikon-meadow-mx',
              `${lastX - meadowRect.left}px`,
            );
            meadowEl.style.setProperty(
              '--eikon-meadow-my',
              `${lastY - meadowRect.top}px`,
            );
          }
        }
      });
    };
    const handleLeave = () => {
      if (!rect) return;
      spot.style.transform = `translate3d(${rect.width / 2 - SPOT_HALF}px,${rect.height / 2 - SPOT_HALF}px,0)`;
      const meadowEl = meadowRef.current;
      if (meadowEl) {
        meadowEl.style.setProperty('--eikon-meadow-mx', '-9999px');
        meadowEl.style.setProperty('--eikon-meadow-my', '-9999px');
      }
    };

    const handleEnter = () => {
      updateRects();
    };

    const handleScroll = () => {
      if (scrollRafId) return;
      scrollRafId = requestAnimationFrame(() => {
        scrollRafId = 0;
        updateRects();
      });
    };

    el.addEventListener('pointermove', handleMove);
    el.addEventListener('pointerenter', handleEnter);
    el.addEventListener('pointerleave', handleLeave);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateRects);
    return () => {
      el.removeEventListener('pointermove', handleMove);
      el.removeEventListener('pointerenter', handleEnter);
      el.removeEventListener('pointerleave', handleLeave);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateRects);
      if (rafId) cancelAnimationFrame(rafId);
      if (scrollRafId) cancelAnimationFrame(scrollRafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
