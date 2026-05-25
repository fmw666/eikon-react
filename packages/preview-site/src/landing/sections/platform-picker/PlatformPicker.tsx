import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { coercePlatform } from '@/lib/params-schema';
import { useShellStore } from '@/shell/store';

import { type I18nKey, useI18n } from '../../theme/i18n';
import { type PlatformOption } from './constants';
import { WebIcon, DesktopIcon, MobileIcon } from './icons';
import { StackedStage } from './StackedStage';

const OPTIONS: ReadonlyArray<PlatformOption> = [
  {
    value: 'web',
    compactTitleKey: 'platform.web.title',
    compactDescKey: 'platform.web.desc',
    titleKey: 'outputs.web.title',
    descKey: 'outputs.web.desc',
    bulletKeys: [
      'outputs.web.bullet1',
      'outputs.web.bullet2',
      'outputs.web.bullet3',
    ],
    Icon: WebIcon,
  },
  {
    value: 'desktop',
    compactTitleKey: 'platform.desktop.title',
    compactDescKey: 'platform.desktop.desc',
    titleKey: 'outputs.desktop.title',
    descKey: 'outputs.desktop.desc',
    bulletKeys: [
      'outputs.desktop.bullet1',
      'outputs.desktop.bullet2',
      'outputs.desktop.bullet3',
    ],
    Icon: DesktopIcon,
  },
  {
    value: 'mobile',
    compactTitleKey: 'platform.mobile.title',
    compactDescKey: 'platform.mobile.desc',
    titleKey: 'outputs.mobile.title',
    descKey: 'outputs.mobile.desc',
    bulletKeys: [
      'outputs.mobile.bullet1',
      'outputs.mobile.bullet2',
      'outputs.mobile.bullet3',
    ],
    Icon: MobileIcon,
  },
];

export const PLATFORM_PICKER_ANCHOR_ID = 'platform';

export interface PlatformPickerProps {
  compact?: boolean;
}

export function PlatformPicker({ compact = false }: PlatformPickerProps = {}) {
  const { t, lang } = useI18n();
  const current = useShellStore((s) => coercePlatform(s.state.platform));
  const setParam = useShellStore((s) => s.setParam);

  if (compact) {
    return (
      <CompactPlatformNav
        options={OPTIONS}
        current={current}
        onSelect={(p) => setParam('platform', p)}
        t={t}
      />
    );
  }

  return (
    <StackedStage
      current={current}
      onSelect={(p) => setParam('platform', p)}
      lang={lang}
      t={t}
      options={OPTIONS}
      anchorId={PLATFORM_PICKER_ANCHOR_ID}
    />
  );
}

function CompactPlatformNav({
  options,
  current,
  onSelect,
  t,
}: {
  options: ReadonlyArray<PlatformOption>;
  current: string;
  onSelect: (p: string) => void;
  t: (key: I18nKey) => string;
}) {
  const activeIdx = options.findIndex((o) => o.value === current);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [enableTransition, setEnableTransition] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const isInitial = useRef(true);

  const recalc = () => {
    const el = tabRefs.current[activeIdx];
    if (!el) return;
    setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  useLayoutEffect(() => {
    recalc();
    if (!enableTransition) {
      requestAnimationFrame(() => setEnableTransition(true));
    }
  }, [activeIdx, enableTransition]);

  useEffect(() => {
    document.fonts.ready.then(() => recalc());
  }, [activeIdx]);
  /* eslint-enable react-hooks/exhaustive-deps */

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
      role="radiogroup"
      aria-label={t('platform.title')}
      className="eikon-compact-picker relative flex rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)]/80 p-1"
    >
      <span
        aria-hidden="true"
        className={
          'pointer-events-none absolute top-1 bottom-1 rounded-[10px] bg-[var(--surface-3)]' +
          ' shadow-[inset_0_1px_0_rgb(255_255_255/0.07),0_1px_4px_rgb(0_0_0/0.2),0_0_12px_-3px_var(--accent-glow)]' +
          (enableTransition
            ? ' transition-all duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)]'
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
            ref={(el) => { tabRefs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(opt.value)}
            className={
              'relative z-10 flex flex-1 items-center justify-center gap-2 rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-colors duration-200 ' +
              (active
                ? 'text-[var(--fg-1)]'
                : 'text-[var(--fg-4)] hover:text-[var(--fg-2)]')
            }
          >
            <opt.Icon className={'h-4 w-4' + (active ? ' text-brand-400' : '')} />
            <span>{t(opt.compactTitleKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
