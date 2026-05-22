import type { ReactNode } from 'react';

import { coercePlatform, type Platform } from '@/lib/params-schema';
import { useShellStore } from '@/shell/store';

import { useI18n, type I18nKey } from '../../theme/i18n';
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
      <div
        role="radiogroup"
        aria-label={t('platform.title')}
        className="flex flex-col gap-1.5"
      >
        {OPTIONS.map((opt) => {
          const active = opt.value === current;
          return (
            <CompactPlatformRow
              key={opt.value}
              active={active}
              title={t(opt.compactTitleKey)}
              desc={t(opt.compactDescKey)}
              Icon={opt.Icon}
              onSelect={() => setParam('platform', opt.value)}
            />
          );
        })}
      </div>
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

function CompactPlatformRow({
  active,
  title,
  desc,
  Icon,
  onSelect,
}: {
  active: boolean;
  title: string;
  desc: string;
  Icon: (props: { className: string }) => ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={
        'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ' +
        (active
          ? 'border-brand-500/45 bg-brand-500/10'
          : 'border-[var(--border-1)] bg-[var(--surface-1)] hover:border-[var(--border-2)] hover:bg-[var(--surface-2)]')
      }
    >
      <span
        className={
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ' +
          (active
            ? 'border-brand-500/40 bg-brand-500/15 text-brand-400'
            : 'border-[var(--border-1)] bg-[var(--surface-2)] text-[var(--fg-2)]')
        }
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className={
            'text-sm font-medium ' +
            (active ? 'text-[var(--fg-1)]' : 'text-[var(--fg-2)]')
          }
        >
          {title}
        </div>
        <div className="truncate text-xs text-[var(--fg-3)]">{desc}</div>
      </div>
      {active && (
        <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500 shadow-[0_0_10px_var(--accent-glow)]" />
      )}
    </button>
  );
}
