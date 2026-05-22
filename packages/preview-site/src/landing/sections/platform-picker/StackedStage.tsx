import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { Platform } from '@/lib/params-schema';

import type { I18nKey } from '../../theme/i18n';
import { type PlatformOption, getCardTransform, getSlot } from './constants';
import { ScaledDeviceShell } from './ScaledDeviceShell';
import { ScreenContent } from './ScreenContent';

export function StackedStage({
  current,
  onSelect,
  lang,
  t,
  options,
  anchorId,
}: {
  current: Platform;
  onSelect: (p: Platform) => void;
  lang: string;
  t: (key: I18nKey) => string;
  options: ReadonlyArray<PlatformOption>;
  anchorId: string;
}) {
  const activeIdx = useMemo(
    () => options.findIndex((o) => o.value === current),
    [current, options]
  );

  const [glassNonce, setGlassNonce] = useState(0);
  const isInitial = useRef(true);
  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    setGlassNonce((n) => n + 1);
  }, [current]);

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const handleSelect = useCallback(
    (p: Platform) => {
      if (p !== current) onSelect(p);
    },
    [current, onSelect]
  );

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
      const dir = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
      const next = (activeIdx + dir + options.length) % options.length;
      onSelect(options[next].value);
      tabRefs.current[next]?.focus();
    },
    [activeIdx, onSelect, options]
  );

  return (
    <section
      id={anchorId}
      className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
      aria-labelledby="platform-title"
    >
      {/* Editorial heading */}
      <div className="mb-8 text-center sm:mb-10">
        <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--fg-4)]">
          <span className="h-px w-6 bg-[var(--border-2)]" />
          {t('platform.eyebrow')}
          <span className="h-px w-6 bg-[var(--border-2)]" />
        </p>
        <h2
          id="platform-title"
          className="text-2xl font-semibold tracking-tight text-[var(--fg-1)] sm:text-3xl"
        >
          {t('platform.title')}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--fg-3)]">
          {t('platform.subtitle')}
        </p>
      </div>

      {/* Tab row with sliding indicator */}
      <TabNav
        options={options}
        current={current}
        activeIdx={activeIdx}
        tabRefs={tabRefs}
        onKeyDown={handleTabsKeyDown}
        onSelect={handleSelect}
        t={t}
      />

      {/* Stage: three device shells stacked */}
      <div className="relative mx-auto max-w-4xl">
        <div
          className="relative aspect-[5/3] w-full"
          style={{ perspective: '1400px' }}
        >
          {options.map((opt, i) => {
            const active = opt.value === current;
            const slot = getSlot(i, activeIdx, options.length);

            return (
              <button
                key={opt.value}
                type="button"
                role="tabpanel"
                aria-label={t(opt.titleKey)}
                aria-hidden={!active}
                tabIndex={-1}
                onClick={() => handleSelect(opt.value)}
                className={
                  'eikon-stack-card absolute inset-0 rounded-2xl text-left outline-none ' +
                  'focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)]'
                }
                style={{
                  transform: getCardTransform(slot, opt.value, current),
                  zIndex:
                    slot === 'center' ? 30 : slot === 'right' ? 20 : 10,
                  pointerEvents: 'none',
                }}
              >
                <ScaledDeviceShell
                  slot={slot}
                  platform={opt.value}
                  active={active}
                  glassNonce={glassNonce}
                  title={t(opt.titleKey)}
                >
                  <ScreenContent
                    eyebrow={t(opt.compactTitleKey)}
                    title={t(opt.titleKey)}
                    desc={t(opt.descKey)}
                    bullets={opt.bulletKeys.map((k) => t(k))}
                    platform={opt.value}
                  />
                </ScaledDeviceShell>
              </button>
            );
          })}
        </div>

        {/* Keyboard hint */}
        <p className="mt-6 hidden text-center text-[11px] text-[var(--fg-4)] [@media(hover:hover)]:block">
          <kbd className="rounded border border-[var(--border-1)] bg-[var(--surface-1)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--fg-3)]">
            ←
          </kbd>{' '}
          <kbd className="rounded border border-[var(--border-1)] bg-[var(--surface-1)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--fg-3)]">
            →
          </kbd>{' '}
          {t('platform.keyboardHint')}
        </p>
      </div>

      <span className="sr-only" aria-hidden="true" data-lang={lang} />
    </section>
  );
}

function TabNav({
  options,
  current,
  activeIdx,
  tabRefs,
  onKeyDown,
  onSelect,
  t,
}: {
  options: ReadonlyArray<PlatformOption>;
  current: Platform;
  activeIdx: number;
  tabRefs: React.MutableRefObject<Array<HTMLButtonElement | null>>;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onSelect: (p: Platform) => void;
  t: (key: I18nKey) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [flashKey, setFlashKey] = useState(0);
  const isInitial = useRef(true);
  const [enableTransition, setEnableTransition] = useState(false);

  const recalcIndicator = () => {
    const el = tabRefs.current[activeIdx];
    if (!el) return;
    setIndicator({
      left: el.offsetLeft,
      width: el.offsetWidth,
    });
  };

  useLayoutEffect(() => {
    recalcIndicator();
    if (!enableTransition) {
      requestAnimationFrame(() => setEnableTransition(true));
    }
  }, [activeIdx, tabRefs, enableTransition]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.fonts.ready.then(() => recalcIndicator());
  }, [activeIdx]);

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    setFlashKey(0);
    const timer = setTimeout(() => setFlashKey((n) => n + 1), 300);
    return () => clearTimeout(timer);
  }, [activeIdx]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={t('platform.title')}
      onKeyDown={onKeyDown}
      className="relative mx-auto mb-6 flex w-fit items-center gap-1 rounded-full border border-[var(--border-1)] bg-[var(--surface-1)] p-1 sm:gap-1.5"
    >
      <span
        className={
          'pointer-events-none absolute top-1 bottom-1 rounded-full bg-[var(--surface-3)] shadow-[inset_0_1px_0_rgb(255_255_255/0.05),0_1px_3px_rgb(0_0_0/0.15)]' +
          (enableTransition
            ? ' transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]'
            : '')
        }
        style={{ left: indicator.left, width: indicator.width }}
      >
        {flashKey > 0 && (
          <span key={flashKey} className="eikon-tab-flash" aria-hidden="true" />
        )}
      </span>
      {options.map((opt, i) => {
        const active = opt.value === current;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(opt.value)}
            className={
              'relative z-10 inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 sm:px-4 sm:py-2 sm:text-sm ' +
              (active
                ? 'text-[var(--fg-1)]'
                : 'text-[var(--fg-3)] hover:text-[var(--fg-1)]')
            }
          >
            <opt.Icon className="h-3.5 w-3.5" />
            <span>{t(opt.compactTitleKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
