import { useEffect, type RefObject } from 'react';

const IDLE_DELAY_MS = 1500;
const SCROLL_CLASS = 'is-scrolling';

/**
 * Adds `.is-scrolling` to a DOM element during active scroll, removes
 * it after `IDLE_DELAY_MS` of inactivity. CSS uses this class to fade
 * scrollbar thumbs in/out (macOS overlay behaviour).
 *
 * Passive listener — zero layout cost.
 */
export function useScrollFade(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    function onScroll() {
      if (!el) return;
      if (!el.classList.contains(SCROLL_CLASS)) {
        el.classList.add(SCROLL_CLASS);
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        el?.classList.remove(SCROLL_CLASS);
      }, IDLE_DELAY_MS);
    }

    el.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      el.removeEventListener('scroll', onScroll, { capture: true });
      if (timer) clearTimeout(timer);
      el.classList.remove(SCROLL_CLASS);
    };
  }, [ref]);
}
