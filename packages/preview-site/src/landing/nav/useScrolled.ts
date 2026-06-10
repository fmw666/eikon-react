import { useEffect, useState } from 'react';

/**
 * `true` once the viewport has scrolled past `threshold` pixels.
 * The scroll listener is `passive: true` + RAF-throttled so it never
 * forces React into a render storm on long scrolls — at most one
 * state update per frame, and only when the boolean actually flips.
 */
export function useScrolled(threshold: number): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let raf = 0;
    let last = false;
    const measure = () => {
      raf = 0;
      const next = window.scrollY > threshold;
      if (next !== last) {
        last = next;
        setScrolled(next);
      }
    };
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [threshold]);
  return scrolled;
}
