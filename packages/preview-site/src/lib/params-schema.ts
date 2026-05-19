/**
 * Single source of truth for every parameter the Eikon React template playground
 * knows about. Three consumers read this list:
 *
 *  1. shell/ParamsPanel — turns each entry into an input control.
 *  2. shell/CommandBar  — diffs the current state vs. defaults to build a CLI.
 *  3. frame/*           — branches at runtime to render the chosen variant.
 *
 * Adding a new parameter only requires appending to PARAMS; the rest is
 * derived automatically (see params-store, params-url, cli-command).
 */

export type BooleanParam = {
  readonly id: string;
  readonly kind: 'boolean';
  readonly default: boolean;
  readonly cliFlag: string;
  readonly label: string;
  /** Axis the param belongs to — used to group controls in the UI. */
  readonly axis: 'feature';
};

export type EnumParam = {
  readonly id: string;
  readonly kind: 'enum';
  readonly values: readonly string[];
  readonly default: string;
  readonly cliFlag: string;
  readonly label: string;
  readonly axis: 'tooling' | 'design' | 'layout' | 'ui';
  /**
   * Optional friendlier labels keyed by `value`. The CLI / URL / build hash
   * always use the raw `value` (kept stable across UI redesigns); the UI
   * just renders `valueLabels?.[v] ?? v` so we can polish the dropdown
   * without churning the schema's contract.
   */
  readonly valueLabels?: Readonly<Record<string, string>>;
};

export type ParamDef = BooleanParam | EnumParam;

export const PARAMS = [
  {
    id: 'supabase',
    kind: 'boolean',
    default: false,
    cliFlag: 'supabase',
    label: 'Supabase',
    axis: 'feature',
  },
  {
    id: 'query',
    kind: 'boolean',
    default: true,
    cliFlag: 'query',
    label: 'TanStack Query',
    axis: 'feature',
  },
  {
    id: 'pm',
    kind: 'enum',
    values: ['pnpm', 'npm', 'bun'],
    default: 'pnpm',
    cliFlag: 'pm',
    label: 'Package manager',
    axis: 'tooling',
  },
  {
    id: 'design',
    kind: 'enum',
    values: ['minimal', 'default', 'brutalist'],
    default: 'default',
    cliFlag: 'design',
    label: 'Design',
    axis: 'design',
  },
  {
    id: 'layout',
    kind: 'enum',
    values: ['stacked', 'sidebar', 'topbar-sidebar', 'centered'],
    default: 'stacked',
    cliFlag: 'layout',
    label: 'Layout',
    axis: 'layout',
    valueLabels: {
      stacked: 'Stacked (centered)',
      sidebar: 'Left sidebar',
      'topbar-sidebar': 'Top + sidebar',
      centered: 'Centered card',
    },
  },
  {
    id: 'ui',
    kind: 'enum',
    values: ['radix', 'shadcn-style', 'animate-ui'],
    default: 'animate-ui',
    cliFlag: 'ui',
    label: 'UI lib',
    axis: 'ui',
  },
] as const satisfies readonly ParamDef[];

export type ParamId = (typeof PARAMS)[number]['id'];

export type ParamValue = string | boolean;

export type ParamState = Record<ParamId, ParamValue>;

const PARAMS_BY_ID = new Map<string, ParamDef>(
  PARAMS.map((p) => [p.id, p])
);

export function getParam(id: string): ParamDef | undefined {
  return PARAMS_BY_ID.get(id);
}

/** Build the default param state from the schema. */
export function defaultState(): ParamState {
  const out: Record<string, ParamValue> = {};
  for (const def of PARAMS) {
    out[def.id] = def.default;
  }
  return out as ParamState;
}

/**
 * Validate (and coerce) an arbitrary value into the schema's expected type for
 * the given param. Returns `undefined` if the value cannot be accepted —
 * caller should fall back to the default.
 */
export function coerceValue(
  def: ParamDef,
  raw: unknown
): ParamValue | undefined {
  if (def.kind === 'boolean') {
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'string') {
      if (raw === 'on' || raw === 'true' || raw === '1') return true;
      if (raw === 'off' || raw === 'false' || raw === '0') return false;
    }
    return undefined;
  }
  if (typeof raw === 'string' && def.values.includes(raw)) return raw;
  return undefined;
}
