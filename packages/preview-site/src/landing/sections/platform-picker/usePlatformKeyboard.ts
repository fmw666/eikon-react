import { useCallback, useEffect, useRef } from 'react';

import type { Platform } from '@/lib/params-schema';

import type { PlatformOption } from './constants';

interface UsePlatformKeyboardOptions {
  activeIdx: number;
  options: ReadonlyArray<PlatformOption>;
  onSelect: (p: Platform) => void;
  tabRefs: React.MutableRefObject<Array<HTMLButtonElement | null>>;
}

interface UsePlatformKeyboardReturn {
  sectionRef: React.RefObject<HTMLElement | null>;
  handleTabsKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

export function usePlatformKeyboard({
  activeIdx,
  options,
  onSelect,
  tabRefs,
}: UsePlatformKeyboardOptions): UsePlatformKeyboardReturn {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useRef(false);

  const activeIdxRef = useRef(activeIdx);
  activeIdxRef.current = activeIdx;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isInView.current = entry.isIntersecting;
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isInView.current) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      const dir = e.key === 'ArrowLeft' ? -1 : 1;
      const next =
        (activeIdxRef.current + dir + options.length) % options.length;
      onSelectRef.current(options[next].value);
      tabRefs.current[next]?.focus();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [options, tabRefs]);

  const handleTabsKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const key = e.key;
      if (
        key !== 'ArrowLeft' &&
        key !== 'ArrowRight' &&
        key !== 'ArrowUp' &&
        key !== 'ArrowDown'
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const dir = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
      const next =
        (activeIdxRef.current + dir + options.length) % options.length;
      onSelectRef.current(options[next].value);
      tabRefs.current[next]?.focus();
    },
    [options, tabRefs]
  );

  return { sectionRef, handleTabsKeyDown };
}
