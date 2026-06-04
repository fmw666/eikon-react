import { useEffect, useState } from 'react';

import type { DevicePlatform } from '../device-shell';
import { pickShellPadding } from '../preview-frame/geometry';

/**
 * React hook wrapping `pickShellPadding` so the padding adapts in
 * real time when the user rotates a phone (portrait ↔ landscape) or
 * resizes the desktop window across the 640px breakpoint.
 *
 * SSR-safe: initialises from `matchMedia` synchronously when `window`
 * exists (this is a Vite SPA, no SSR), otherwise defaults to the
 * desktop padding.
 */
export function useShellOuterPadding(platform: DevicePlatform): number {
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return false;
    }
    return window.matchMedia('(max-width: 640px)').matches;
  });
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }
    const mq = window.matchMedia('(max-width: 640px)');
    const handler = (e: MediaQueryListEvent) => setIsMobileViewport(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return pickShellPadding(platform, isMobileViewport);
}
