/**
 * @file ParamsPanel.tsx
 * @description Parameter configurator for the playground.
 *
 * History: this panel used to own the platform segmented control at the
 * top, but the landing page now hosts `PlatformPicker` as a section of
 * its own (the platform choice is the primary visual axis, not a
 * configurator-internal knob). So this panel:
 *
 *   - Renders every param EXCEPT `platform` itself.
 *   - Continues to honour the schema's `availableWhen` / `valuesWhen` /
 *     `defaultWhen` cross-axis rules — controls show / hide / narrow as
 *     the platform changes (driven from PlatformPicker through the
 *     shared store, exactly the same wiring as before).
 *
 * Visual model: a card with two semantic sub-sections separated by a
 * thin divider — "Configuration" (controls that actually change the
 * build hash) and "Tooling" (e.g. package manager, which only affects
 * the rendered CLI command, never the build).
 */

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

// Each element of PARAMS keeps its literal `id` type because the schema
// uses `as const satisfies ...`. We re-use that narrow union so the
// `def.id` we pass into `setParam` below is still `ParamId`, not the
// wider `string` that `ParamDef` exposes. Without this alias the
// generic `setParam<K extends ParamId>` overload would refuse the call.
type SchemaParam = (typeof PARAMS)[number];

// Params that should be considered "tooling" rather than build inputs.
// They affect the rendered CLI command but not the build hash. The
// schema-level `axis` field already tags them, but we duplicate the
// classification here as a UI-side allowlist so re-tagging in the
// schema doesn't silently move controls between sections of this card.
const TOOLING_IDS = new Set<string>(['pm']);

function isToolingParam(def: SchemaParam): boolean {
  return TOOLING_IDS.has(def.id);
}

export function ParamsPanel() {
  const state = useShellStore((s) => s.state);
  const setParam = useShellStore((s) => s.setParam);
  const platform = coercePlatform(state.platform);

  // Memo so re-rendering on an unrelated state field (e.g. toggling
  // `supabase`) doesn't force the whole param list to re-filter.
  const visible = useMemo(
    () =>
      PARAMS.filter(
        (def) => def.id !== 'platform' && isAvailable(def, platform)
      ) as ReadonlyArray<SchemaParam>,
    [platform]
  );

  const buildParams = visible.filter((def) => !isToolingParam(def));
  const toolingParams = visible.filter(isToolingParam);

  return (
    <div
      key={platform}
      className="rounded-2xl border border-[var(--border-1)] bg-[var(--surface-1)] p-5"
      style={{ animation: 'eikon-params-fade 200ms ease-out' }}
    >
      <ParamGrid
        items={buildParams}
        state={state}
        platform={platform}
        onChange={setParam}
      />

      {toolingParams.length > 0 && (
        <>
          <div className="my-5 h-px w-full bg-[var(--border-1)]" />
          <ParamGrid
            items={toolingParams}
            state={state}
            platform={platform}
            onChange={setParam}
          />
        </>
      )}
    </div>
  );
}

function ParamGrid({
  items,
  state,
  platform,
  onChange,
}: {
  items: ReadonlyArray<SchemaParam>;
  state: ReturnType<typeof useShellStore.getState>['state'];
  platform: Platform;
  onChange: ReturnType<typeof useShellStore.getState>['setParam'];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((def) => {
        if (def.kind === 'boolean') {
          return (
            <BooleanControl
              key={def.id}
              def={def}
              value={state[def.id] as boolean}
              onChange={(v) => onChange(def.id, v)}
            />
          );
        }
        return (
          <EnumControl
            key={def.id}
            def={def}
            platform={platform}
            value={state[def.id] as string}
            onChange={(v) => onChange(def.id, v)}
          />
        );
      })}
    </div>
  );
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
    <label
      className={
        'flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-[var(--surface-2)] px-3 py-2.5 text-sm transition hover:border-[var(--border-2)] ' +
        (value ? 'border-brand-500/40 text-[var(--fg-1)]' : 'border-[var(--border-1)] text-[var(--fg-2)]')
      }
    >
      <span className="font-medium">{def.label}</span>
      <Switch checked={value} onChange={onChange} />
    </label>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={
        'relative h-5 w-9 shrink-0 rounded-full transition ' +
        (checked ? 'bg-brand-500' : 'bg-[var(--border-2)]')
      }
    >
      <span
        aria-hidden="true"
        className={
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ' +
          (checked ? 'translate-x-[18px]' : 'translate-x-0.5')
        }
      />
    </button>
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
  const allowedValues = getEffectiveValues(def, platform);
  const effectiveDefault = getEffectiveDefault(def, platform);

  // `pm` is a 3-state choice and reads better as a segmented control
  // than a dropdown. Everything else stays on a styled <select> — it
  // scales to any number of options without overflowing the row.
  if (def.id === 'pm') {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--fg-3)]">
          {def.label}
        </span>
        <div className="inline-flex w-fit overflow-hidden rounded-lg border border-[var(--border-1)] bg-[var(--surface-2)] p-0.5">
          {allowedValues.map((v) => {
            const active = v === value;
            return (
              <button
                key={v}
                type="button"
                onClick={() => onChange(v)}
                aria-pressed={active}
                className={
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ' +
                  (active
                    ? 'bg-brand-500/15 text-brand-400'
                    : 'text-[var(--fg-3)] hover:text-[var(--fg-1)]')
                }
              >
                <span>{def.valueLabels?.[v] ?? v}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--fg-3)]">
        {def.label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-2 pr-9 text-sm text-[var(--fg-1)] transition hover:border-[var(--border-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          {allowedValues.map((v) => {
            const label = def.valueLabels?.[v] ?? v;
            return (
              <option key={v} value={v}>
                {v === effectiveDefault ? `${label} (default)` : label}
              </option>
            );
          })}
        </select>
        <ChevronIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--fg-3)]" />
      </div>
    </label>
  );
}

function ChevronIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
