import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  PARAMS,
  coercePlatform,
  getEffectiveValues,
  isAvailable,
  type EnumParam,
  type Platform,
} from '@/lib/params-schema';
import { useI18n } from '@/landing/theme/i18n';

import { useShellStore } from './store';

type SchemaParam = (typeof PARAMS)[number];

export function ParamsPanel() {
  const { t } = useI18n();
  const state = useShellStore((s) => s.state);
  const setParam = useShellStore((s) => s.setParam);
  const platform = coercePlatform(state.platform);

  const visible = useMemo(
    () =>
      PARAMS.filter(
        (def) => def.id !== 'platform' && isAvailable(def, platform)
      ) as ReadonlyArray<SchemaParam>,
    [platform]
  );

  const getEnum = useCallback(
    (id: string) => visible.find((d) => d.id === id) as EnumParam | undefined,
    [visible]
  );

  const layoutDef = getEnum('layout');
  const designDef = getEnum('design');
  const uiDef = getEnum('ui');
  const toastDef = getEnum('toast');
  const pmDef = getEnum('pm');
  const supabaseVisible = visible.some((d) => d.id === 'supabase');

  return (
    <div
      key={platform}
      className="relative z-10 rounded-xl border border-[var(--border-1)]/40 bg-[var(--surface-1)]/25 p-3.5 text-[13px] leading-[2] text-[var(--fg-3)] backdrop-blur-sm"
      style={{ animation: 'eikon-params-fade 200ms ease-out' }}
    >
      <p className="flex flex-wrap items-center gap-x-1 gap-y-2">
        <span>{t('params.sentence.prefix')}</span>
        {layoutDef && (
          <InlineSlot
            def={layoutDef}
            platform={platform}
            value={state.layout as string}
            onChange={(v) => setParam('layout', v)}
          />
        )}
        <span>{t('params.sentence.layoutSuffix')}</span>

        {t('params.sentence.designPrefix') && (
          <span>{t('params.sentence.designPrefix')}</span>
        )}
        {designDef && (
          <InlineSlot
            def={designDef}
            platform={platform}
            value={state.design as string}
            onChange={(v) => setParam('design', v)}
            shortLabels
          />
        )}
        <span>{t('params.sentence.designSuffix')}</span>

        {t('params.sentence.uiPrefix') && (
          <span>{t('params.sentence.uiPrefix')}</span>
        )}
        {uiDef && (
          <InlineSlot
            def={uiDef}
            platform={platform}
            value={state.ui as string}
            onChange={(v) => setParam('ui', v)}
          />
        )}
        <span>{t('params.sentence.uiSuffix')}</span>

        {t('params.sentence.toastPrefix') && (
          <span>{t('params.sentence.toastPrefix')}</span>
        )}
        {toastDef && (
          <InlineSlot
            def={toastDef}
            platform={platform}
            value={state.toast as string}
            onChange={(v) => setParam('toast', v)}
            shortLabels
          />
        )}
        <span>{t('params.sentence.toastSuffix')}</span>

        {supabaseVisible && (
          <BooleanChip
            label="Supabase"
            checked={state.supabase as boolean}
            onChange={(v) => setParam('supabase', v)}
          />
        )}

        {pmDef && (
          <>
            <span>{t('params.sentence.pmPrefix')}</span>
            <InlineSlot
              def={pmDef}
              platform={platform}
              value={state.pm as string}
              onChange={(v) => setParam('pm', v)}
            />
            {t('params.sentence.pmSuffix') && (
              <span>{t('params.sentence.pmSuffix')}</span>
            )}
          </>
        )}
      </p>
    </div>
  );
}

function InlineSlot({
  def,
  platform,
  value,
  onChange,
  shortLabels = false,
}: {
  def: EnumParam;
  platform: Platform;
  value: string;
  onChange: (v: string) => void;
  shortLabels?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  const allowedValues = getEffectiveValues(def, platform);

  const displayLabel = shortLabels
    ? shortLabel(def.valueLabels?.[value] ?? value)
    : (def.valueLabels?.[value] ?? value);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [open]);

  return (
    <span ref={ref} className="eikon-inline-slot inline-flex items-center" data-open={open || undefined}>
      <span
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        className="inline-flex items-center gap-0.5 font-medium text-[var(--fg-1)]"
      >
        {displayLabel}
        <span className="eikon-slot-chevron text-[9px] leading-none text-[var(--fg-4)]">▾</span>
      </span>

      {open && (
        <span className="eikon-slot-dropdown" role="listbox">
          {allowedValues.map((v) => {
            const label = shortLabels
              ? shortLabel(def.valueLabels?.[v] ?? v)
              : (def.valueLabels?.[v] ?? v);
            return (
              <button
                key={v}
                type="button"
                role="option"
                aria-selected={v === value}
                data-active={v === value || undefined}
                onClick={() => {
                  onChange(v);
                  setOpen(false);
                }}
              >
                {label}
              </button>
            );
          })}
        </span>
      )}
    </span>
  );
}

function BooleanChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="eikon-boolean-chip inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-0.5 text-[12px] font-medium"
      data-checked={checked || undefined}
    >
      <span className="eikon-boolean-indicator">{checked ? '+' : '–'}</span>
      <span>{label}</span>
    </button>
  );
}

function shortLabel(full: string): string {
  const paren = full.indexOf('(');
  if (paren > 0) return full.slice(0, paren).trim();
  return full;
}
