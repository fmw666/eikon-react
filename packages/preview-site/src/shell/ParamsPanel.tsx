import { PARAMS, type BooleanParam, type EnumParam } from '@/lib/params-schema';

import { useShellStore } from './store';

/**
 * Unstyled controls — one per param. Layout is a single horizontal flex row
 * that wraps; the explicit "design" decision is deferred until visual polish.
 */
export function ParamsPanel() {
  const state = useShellStore((s) => s.state);
  const setParam = useShellStore((s) => s.setParam);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        marginTop: 8,
      }}
    >
      {PARAMS.map((def) => {
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
            value={state[def.id] as string}
            onChange={(v) => setParam(def.id, v)}
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
  value,
  onChange,
}: {
  def: EnumParam;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {def.label}:
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {def.values.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );
}
