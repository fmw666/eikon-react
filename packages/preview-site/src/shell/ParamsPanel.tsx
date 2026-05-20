import { useMemo } from 'react';

import {
  PARAMS,
  coercePlatform,
  getEffectiveDefault,
  getEffectiveValues,
  isAvailable,
  type BooleanParam,
  type EnumParam,
  type Platform,
} from '@/lib/params-schema';

import { useShellStore } from './store';

/**
 * Unstyled controls — one per param. Layout:
 *
 *   ┌──────────────────────────────────────────────┐
 *   │       [ Web ]  [ Desktop ]  [ Mobile ]       │  ← platform tab (top)
 *   ├──────────────────────────────────────────────┤
 *   │ Layout: [▾ Stacked]   UI: [▾ animate-ui] …   │  ← platform-filtered
 *   └──────────────────────────────────────────────┘
 *
 * The top row is a segmented control because `platform` is mutually
 * exclusive AND it changes which controls below appear / which values
 * they accept (see `params-store.snapToPlatform`). The lower row reuses
 * the existing flex-wrap of unstyled controls; a 200ms opacity fade on
 * platform change hints to the user that the available choices below
 * have just shifted.
 */
export function ParamsPanel() {
  const state = useShellStore((s) => s.state);
  const setParam = useShellStore((s) => s.setParam);
  const platform = coercePlatform(state.platform);

  // The visible-controls list changes when platform changes; memoising
  // keeps the lower row stable across unrelated state mutations (toggling
  // a checkbox doesn't recompute the filter).
  const visibleParams = useMemo(
    () => PARAMS.filter((def) => def.id !== 'platform' && isAvailable(def, platform)),
    [platform]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
      <PlatformTabs
        value={platform}
        onChange={(next) => setParam('platform', next)}
      />
      <div
        key={platform}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          // Cheap visual cue that the set of choices below was just
          // refreshed by a platform change. The `key={platform}` above
          // forces a remount so the animation re-fires.
          animation: 'eikon-params-fade 200ms ease-out',
        }}
      >
        <style>
          {`@keyframes eikon-params-fade { from { opacity: 0.4; } to { opacity: 1; } }`}
        </style>
        {visibleParams.map((def) => {
          if (def.kind === 'boolean') {
            return (
              <BooleanControl
                key={def.id}
                def={def}
                value={state[def.id] as boolean}
                onChange={(v) => setParam(def.id, v)}
              />
            );
          }
          return (
            <EnumControl
              key={def.id}
              def={def}
              platform={platform}
              value={state[def.id] as string}
              onChange={(v) => setParam(def.id, v)}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Top-of-panel segmented control. The `platform` param is special-cased
 * because it owns the cross-axis filter rules below — pulling it out of
 * the generic `visibleParams` map makes the visual hierarchy explicit
 * (intent above, configuration below).
 */
function PlatformTabs({
  value,
  onChange,
}: {
  value: Platform;
  onChange: (next: Platform) => void;
}) {
  const platformParam = PARAMS.find((p) => p.id === 'platform');
  if (!platformParam || platformParam.kind !== 'enum') return null;
  return (
    <div
      role="tablist"
      aria-label="Target platform"
      style={{
        display: 'inline-flex',
        alignSelf: 'center',
        gap: 0,
        background: '#1f1f1f',
        border: '1px solid #3a3a3a',
        borderRadius: 4,
        padding: 2,
      }}
    >
      {platformParam.values.map((v) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v as Platform)}
            title={platformParam.valueLabels?.[v] ?? v}
            style={{
              background: active ? '#0e639c' : 'transparent',
              color: active ? '#fff' : '#d4d4d4',
              border: 'none',
              borderRadius: 3,
              padding: '4px 14px',
              fontSize: 12,
              fontWeight: active ? 500 : 400,
              cursor: 'pointer',
              minWidth: 72,
            }}
          >
            {labelFor(v)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Short label for the platform tab itself. The schema's `valueLabels` is
 * a longer dropdown-style description ("Web (browser)") that's overkill
 * for a tab; reuse the raw value here capitalised.
 */
function labelFor(v: string): string {
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function BooleanControl({
  def,
  value,
  onChange,
}: {
  def: BooleanParam;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {def.label}
    </label>
  );
}

function EnumControl({
  def,
  platform,
  value,
  onChange,
}: {
  def: EnumParam;
  platform: Platform;
  value: string;
  onChange: (next: string) => void;
}) {
  // Per-platform value narrowing. The store already snapped `value` to a
  // valid choice when the platform changed (see `snapToPlatform`); this
  // just makes sure the rendered <option>s mirror what the store will
  // accept.
  const allowedValues = getEffectiveValues(def, platform);
  // The platform-specific default is shown with a "(default)" suffix so
  // the user can tell which option they'd land on if they reset.
  const effectiveDefault = getEffectiveDefault(def, platform);
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {def.label}:
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {allowedValues.map((v) => {
          const label = def.valueLabels?.[v] ?? v;
          return (
            <option key={v} value={v}>
              {v === effectiveDefault ? `${label} (default)` : label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
