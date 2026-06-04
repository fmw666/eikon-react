import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import type { DevicePlatform } from '../device-shell';
import type { FrameSize } from '../store';

import { getShellNaturalSize } from './geometry';

export function ScaledShellWrapper({ platform, size, children }: { platform: DevicePlatform; size: FrameSize; children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [enableTransition, setEnableTransition] = useState(false);
  const prevPlatformRef = useRef(platform);
  const natural = getShellNaturalSize(platform, size);

  // Disable transition on platform change so scale snaps instantly
  useLayoutEffect(() => {
    if (prevPlatformRef.current !== platform) {
      prevPlatformRef.current = platform;
      setEnableTransition(false);
    }
  }, [platform]);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    let raf = 0;
    const recalc = (): void => {
      // Use offsetWidth/offsetHeight instead of getBoundingClientRect()
      // because the workbench card has a scroll-driven scale animation
      // and BCR reflects ancestor transforms, giving wrong values.
      const w = wrapper.offsetWidth;
      const h = wrapper.offsetHeight;
      if (!w || !h) return;
      const s = Math.min(1, w / natural.width, h / natural.height);
      setScale(s);
    };
    // P4.16: rAF-throttle the ResizeObserver callback. A drag-resize
    // can fire ResizeObserver dozens of times per frame; without
    // coalescing, each one schedules its own setState → setScale →
    // synchronous transform recalculation in React. Batching to a
    // single rAF gives the browser one chance to paint between bursts
    // and removes the visible scale-stutter on slow machines.
    const onResize = (): void => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        recalc();
      });
    };
    recalc();
    const ro = new ResizeObserver(onResize);
    ro.observe(wrapper);
    return () => {
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [natural.width, natural.height]);

  // Enable transition after layout settles
  useEffect(() => {
    if (!enableTransition) {
      const timer = setTimeout(() => setEnableTransition(true), 400);
      return () => clearTimeout(timer);
    }
  }, [enableTransition]);

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, transform: `scale(${scale})`, transformOrigin: 'center center', transition: enableTransition ? 'transform 420ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none' }}>
        {children}
      </div>
    </div>
  );
}
