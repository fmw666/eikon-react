/**
 * @file LoadingBar.tsx
 * @description Hairline progress bar pinned to the top of the
 * viewport, driven by the SPA router's "navigation pending" state.
 *
 * Behaviour (nprogress-style, three observable phases):
 *
 *   - SHOW_DELAY_MS gate
 *       When `pending` flips true we wait briefly before painting
 *       anything. Most transitions finish under this threshold
 *       (the chunk was already prefetched on hover, so React
 *       commits the new route in well under a frame). Showing the
 *       bar for those would just be flicker; we'd rather show
 *       nothing at all.
 *
 *   - Crawl (0 → CRAWL_TARGET over CRAWL_DURATION_MS, ease-out)
 *       Once we decide to show, the bar fades in and `scaleX`
 *       crawls from 0 toward ~85% on a slow ease-out. It
 *       deliberately *never* reaches 100% on its own — the real
 *       completion time is unknown (the chunk could arrive in 50ms
 *       or 5s) and stopping short at "almost done" is more
 *       honest than fabricating progress.
 *
 *   - Finish (CRAWL_TARGET → 1 → fade)
 *       When `pending` flips false we snap to 100% on a short
 *       cubic so the eye registers a clean "done!", hold for
 *       FINISH_HOLD_MS so the snap is perceivable, then fade out
 *       over FADE_DURATION_MS.
 *
 * Implementation notes:
 *
 *   - Single `<div>` with inline styles — no extra DOM nodes, no
 *     classNames the user could accidentally override, and the bar
 *     lives outside the Nav region (fixed top-0) so it stays put
 *     even if the Nav scales/glassifies on scroll.
 *
 *   - `transform: scaleX(...)` + `transform-origin: left` keeps the
 *     animation on the compositor. `opacity` is the only other
 *     animated property. Both are GPU-cheap and never trigger
 *     layout or paint of the surrounding chrome.
 *
 *   - The state machine lives in a single useEffect keyed on
 *     `pending`. Internal "is currently visible" is tracked in a
 *     ref (not a state) so transient toggles don't re-fire the
 *     effect and accidentally reset the crawl progress.
 *
 *   - `prefers-reduced-motion`: we deliberately keep this bar
 *     active even when motion is reduced. It's a sub-second
 *     non-decorative status indicator (loading state); hiding it
 *     would actively harm a11y, not help it. The transitions are
 *     already short and small-amplitude.
 */
import { useEffect, useRef, useState } from 'react';

/** Don't paint anything for transitions shorter than this — most
 *  prefetched routes finish well under one frame and showing the
 *  bar for them would just be flicker. */
const SHOW_DELAY_MS = 80;
/** Duration of the "0 → 85%" crawl once we've decided to show. */
const CRAWL_DURATION_MS = 800;
/** Where the crawl stops while we're still waiting on the chunk —
 *  intentionally short of 100% so we don't lie about completion. */
const CRAWL_TARGET = 0.85;
/** How long to hold at 100% before fading out, so the finish snap
 *  is perceivable rather than a sub-frame blip. */
const FINISH_HOLD_MS = 120;
/** Length of the fade-out itself. */
const FADE_DURATION_MS = 250;

export function LoadingBar({ pending }: { pending: boolean }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  // True while the bar is in its "snap to 100% then fade" phase.
  // Drives a different transition curve than the slow crawl.
  const [finishing, setFinishing] = useState(false);
  // Mirror of `visible` kept as a ref so the effect below can
  // branch on it without putting `visible` in the dep array
  // (which would cause the effect to re-fire and reset progress).
  const visibleRef = useRef(false);

  useEffect(() => {
    if (pending) {
      // We're entering / re-entering the crawl phase. Make sure
      // any in-flight "finishing" animation is cancelled — if
      // the user clicks another nav link while the previous
      // transition is still finishing, we want a clean restart.
      setFinishing(false);

      if (visibleRef.current) {
        // Already on screen (rapid toggle back). Just restart the
        // crawl from 0 instead of waiting through SHOW_DELAY_MS
        // again — the bar is already visible, hiding/re-showing
        // would flicker.
        setProgress(0);
        const rafId = window.requestAnimationFrame(() =>
          setProgress(CRAWL_TARGET)
        );
        return () => window.cancelAnimationFrame(rafId);
      }

      let rafId = 0;
      const showTimer = window.setTimeout(() => {
        visibleRef.current = true;
        setVisible(true);
        setProgress(0);
        // The transition only fires when the layout has
        // committed with `progress = 0`; without a frame gap
        // React could batch the two updates and the bar would
        // pop straight to CRAWL_TARGET with no animation.
        rafId = window.requestAnimationFrame(() =>
          setProgress(CRAWL_TARGET)
        );
      }, SHOW_DELAY_MS);
      return () => {
        window.clearTimeout(showTimer);
        if (rafId) window.cancelAnimationFrame(rafId);
      };
    }

    // pending = false. If we never made it past the SHOW_DELAY
    // (fast transition), the bar is still hidden — just bail.
    if (!visibleRef.current) return;

    setFinishing(true);
    setProgress(1);
    const finishTimer = window.setTimeout(() => {
      visibleRef.current = false;
      setVisible(false);
      setProgress(0);
      setFinishing(false);
    }, FINISH_HOLD_MS + FADE_DURATION_MS);
    return () => window.clearTimeout(finishTimer);
  }, [pending]);

  // Two transition recipes, picked at render time:
  //
  //   - finishing : short cubic snap on transform, fade-out on
  //                 opacity with a hold delay so the snap to 100%
  //                 reads as "ta-da!" before the bar disappears.
  //   - crawling  : long ease-out on transform (slow, deliberate),
  //                 quick fade-in on opacity.
  const transition = finishing
    ? `transform 180ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${FADE_DURATION_MS}ms ease-out ${FINISH_HOLD_MS}ms`
    : `transform ${CRAWL_DURATION_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 220ms ease-out`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px]"
      style={{
        opacity: visible ? 1 : 0,
        transform: `scaleX(${progress})`,
        transformOrigin: 'left',
        background:
          'linear-gradient(90deg, var(--color-brand-500) 0%, var(--color-brand-300) 50%, var(--color-brand-500) 100%)',
        boxShadow:
          '0 0 10px rgba(165, 180, 252, 0.45), 0 0 4px rgba(165, 180, 252, 0.6)',
        transition,
        willChange: 'transform, opacity',
      }}
    />
  );
}
