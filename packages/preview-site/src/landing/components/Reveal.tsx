/**
 * @file Reveal.tsx
 * @description Lightweight "rise into view" wrapper for scroll-triggered
 * entrance animations.
 *
 * Pattern
 * -------
 * Each <Reveal> renders a single wrapper div that starts in a
 * translated + dimmed CSS state. An IntersectionObserver flips the
 * wrapper's `data-revealed` attribute to `"true"` the first time it
 * crosses ~12% of the viewport, which lets the matching CSS in
 * `index.css` lift the element into its resting state with a 720ms
 * spring curve (`cubic-bezier(0.16, 1, 0.3, 1)`).
 *
 * Why not Framer Motion
 * ---------------------
 * The site already speaks pure-CSS animation everywhere
 * (`eikon-route-enter`, `eikon-footer-shine`, `eikon-conic-border`,
 * the meadow masks, …). Pulling a 60+ KB motion library in just to
 * fade sections up would weigh more than the animation itself
 * and break the "one transition language across the site" feel.
 *
 * Variants
 * --------
 *   - `rise`        (default): fade + 28px translateY + tiny scale.
 *                   The neutral choice for a whole section.
 *   - `rise-scale`: fade + 36px translateY + more aggressive
 *                   scale (0.94). Use for big card/grid sections
 *                   that benefit from a small "pop" on arrival.
 *   - `zoom`:       fade + scale only, no translate. Good for hero
 *                   panels / feature surfaces that should appear
 *                   to "settle in place" rather than rise.
 *   - `left` /      slide in horizontally. Reserve for side-rail
 *     `right`       reveals where horizontal motion matches the
 *                   section's reading direction.
 *
 * First-paint behaviour
 * ---------------------
 * Elements that are already in view on first mount (e.g. the Hero
 * on a cold-load) still play the full reveal beat — a `requestAnimation
 * Frame ×2` defers the `data-revealed` flip past the initial paint
 * so the transition fires instead of snapping. Without the double-RAF
 * the browser would composite the final state on the same frame as
 * the initial one and skip the animation entirely.
 *
 * SSR / no-IO / reduced-motion fallback
 * -------------------------------------
 * If `window`, `IntersectionObserver`, or the user's reduced-motion
 * preference rules out animation, the element paints in its final
 * resting state with no transition. The CSS layer carries the
 * reduced-motion override; this module only handles the SSR/IO
 * absence (defaults to "instantly reveal" rather than "never reveal").
 */

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react';

import { getLastNavTimestamp } from '../nav/route';

export type RevealVariant =
  | 'rise'
  | 'rise-scale'
  | 'zoom'
  | 'left'
  | 'right';

interface RevealProps {
  children: ReactNode;
  /** Visual variant — see file-level comment. Defaults to `rise`. */
  variant?: RevealVariant;
  /**
   * Extra delay (ms) between the reveal trigger and the CSS
   * transition firing. Use to stagger sibling reveals so they
   * don't all arrive on the same frame.
   */
  delay?: number;
  /**
   * Fraction of the wrapper that must be visible to trigger the
   * reveal. 0.12 = ~12%; lower values fire earlier (the section
   * "peeks in" before fully arriving), higher values wait longer.
   */
  threshold?: number;
  /** Optional extra className merged onto the wrapper. */
  className?: string;
  /** Inline style merged onto the wrapper (rare — prefer className). */
  style?: CSSProperties;
  /**
   * Override the wrapper element. Defaults to a plain `div`. Use
   * `section` for top-level page sections so the document outline
   * still reads correctly.
   */
  as?: 'div' | 'section' | 'span';
}

export function Reveal({
  children,
  variant = 'rise',
  delay = 0,
  threshold = 0.12,
  className,
  style,
  as: Tag = 'div',
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  // Synchronous reveal for elements in viewport during a route nav.
  // Runs before paint so the VT "new state" capture shows them visible.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === 'undefined') return;

    const mountedDuringNav = Date.now() - getLastNavTimestamp() < 600;
    if (!mountedDuringNav) return;

    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    const minVisiblePx = rect.height * threshold;
    const visible =
      rect.top < vh - minVisiblePx && rect.bottom > minVisiblePx;

    if (visible) {
      el.style.transition = 'none';
      el.setAttribute('data-revealed', 'true');
    }
  }, [threshold]);

  // Restore transition property after paint so future reveals (if any)
  // still animate, and set up IntersectionObserver for below-fold items.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window === 'undefined' ||
      typeof IntersectionObserver === 'undefined'
    ) {
      el.setAttribute('data-revealed', 'true');
      return;
    }

    // Already revealed by the layout effect above — just restore transition.
    if (el.getAttribute('data-revealed') === 'true') {
      requestAnimationFrame(() => {
        el.style.transition = '';
      });
      return;
    }

    let cancelled = false;
    let observer: IntersectionObserver | null = null;

    const tryRevealInPlace = (): boolean => {
      if (cancelled) return false;
      const rect = el.getBoundingClientRect();
      const vh =
        window.innerHeight || document.documentElement.clientHeight || 0;
      const minVisiblePx = rect.height * threshold;
      const visible =
        rect.top < vh - minVisiblePx && rect.bottom > minVisiblePx;
      if (visible) {
        el.setAttribute('data-revealed', 'true');
        return true;
      }
      return false;
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (tryRevealInPlace()) return;
        observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                el.setAttribute('data-revealed', 'true');
                observer?.disconnect();
                observer = null;
                break;
              }
            }
          },
          {
            threshold,
            rootMargin: '0px 0px -8% 0px',
          }
        );
        observer.observe(el);
      });
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [threshold]);

  const mergedClass = [
    'eikon-reveal',
    `eikon-reveal-${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const mergedStyle: CSSProperties = {
    ...(delay
      ? ({ '--eikon-reveal-delay': `${delay}ms` } as CSSProperties)
      : {}),
    ...style,
  };

  return (
    <Tag
      ref={ref as React.RefObject<never>}
      className={mergedClass}
      style={mergedStyle}
    >
      {children}
    </Tag>
  );
}
