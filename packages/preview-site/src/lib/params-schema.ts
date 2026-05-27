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
 *
 * --- Platform axis (the "tab" knob) ---
 *
 * `platform` is the top-level intent axis: web (browser), desktop (Tauri 2),
 * mobile (Capacitor). It is rendered as a segmented control above the rest
 * of the controls; the other params consult its current value via the
 * optional `availableWhen` / `valuesWhen` / `defaultWhen` hooks below to
 * filter their visibility, restrict their accepted values, or shift their
 * defaults per-platform. The schema stays the source of truth — UI / URL /
 * CLI / build-input layers all read from it without their own copies of
 * the cross-axis rules.
 */

export const PLATFORM_VALUES = ['web', 'desktop', 'mobile'] as const;
export type Platform = (typeof PLATFORM_VALUES)[number];

export type BooleanParam = {
  readonly id: string;
  readonly kind: 'boolean';
  readonly default: boolean;
  readonly cliFlag: string;
  readonly label: string;
  /** Axis the param belongs to — used to group controls in the UI. */
  readonly axis: 'feature';
  readonly availableWhen?: { readonly platform: readonly Platform[] };
};

export type EnumParam = {
  readonly id: string;
  readonly kind: 'enum';
  readonly values: readonly string[];
  readonly default: string;
  readonly cliFlag: string;
  readonly label: string;
  readonly axis: 'tooling' | 'design' | 'layout' | 'ui' | 'platform';
  /**
   * Optional friendlier labels keyed by `value`. The CLI / URL / build hash
   * always use the raw `value` (kept stable across UI redesigns); the UI
   * just renders `valueLabels?.[v] ?? v` so we can polish the dropdown
   * without churning the schema's contract.
   */
  readonly valueLabels?: Readonly<Record<string, string>>;
  /**
   * Cross-axis filter: if set, this param is only available (rendered in
   * the UI, accepted by URL parsing, emitted by the CLI) when the chosen
   * `platform` is in this list. Absent → available on every platform.
   */
  readonly availableWhen?: { readonly platform: readonly Platform[] };
  /**
   * Cross-axis enum narrowing: per-platform override of `values`. Falls back
   * to the unconstrained `values` when the current platform isn't keyed.
   * Used e.g. to hide desktop-only `sidebar` layouts on mobile.
   */
  readonly valuesWhen?: Partial<Record<Platform, readonly string[]>>;
  /**
   * Cross-axis default override: per-platform override of `default`. Falls
   * back to `default` when the current platform isn't keyed. The store snaps
   * to this when the user switches platform and the current value is no
   * longer valid for the new platform's `valuesWhen`.
   */
  readonly defaultWhen?: Partial<Record<Platform, string>>;
};

export type ParamDef = BooleanParam | EnumParam;

export const PARAMS = [
  {
    id: 'platform',
    kind: 'enum',
    values: PLATFORM_VALUES,
    default: 'web',
    cliFlag: 'platform',
    label: 'Target',
    axis: 'platform',
    valueLabels: {
      web: 'Web (browser)',
      desktop: 'Desktop (Tauri 2)',
      mobile: 'Mobile (Capacitor)',
    },
  },
  {
    id: 'supabase',
    kind: 'boolean',
    default: false,
    cliFlag: 'supabase',
    label: 'Supabase',
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
    values: [
      'default',
      'apple',
      'linear',
      'anthropic',
      'vercel',
      'notion',
      'flat',
      'material',
      'skeuomorphism',
      'neumorphism',
      'liquid-glass',
      'claymorphism',
      'aurora',
      'neo-brutalism',
    ],
    default: 'default',
    cliFlag: 'design',
    label: 'Design',
    axis: 'design',
    valueLabels: {
      default: 'Default (neutral violet)',
      apple: 'Apple HIG (systemBlue + SF Pro)',
      linear: 'Linear (lavender-blue + Inter)',
      anthropic: 'Anthropic (Claude orange + serif)',
      vercel: 'Vercel Geist (mono ink)',
      notion: 'Notion (warm gray + blue)',
      flat: 'Flat (zero shadow, solid)',
      material: 'Material Design 3 (elevation)',
      skeuomorphism: 'Skeuomorphism (realistic)',
      neumorphism: 'Neumorphism (soft plastic)',
      'liquid-glass': 'Liquid Glass (refractive)',
      claymorphism: 'Claymorphism (puffy 3D)',
      aurora: 'Aurora (gradient glow)',
      'neo-brutalism': 'NEO-Brutalism (hard outlines)',
    },
  },
  {
    id: 'layout',
    kind: 'enum',
    /**
     * The full universe of layout values. The first 4 are the original
     * desktop-shaped layouts; the last 3 are mobile-shaped variants
     * introduced alongside the platform tab. `valuesWhen` below narrows
     * each platform to the subset that physically makes sense — the UI
     * only ever offers 4 entries to any one user.
     */
    values: [
      'stacked',
      'sidebar',
      'topbar-sidebar',
      'centered',
      'mobile-drawer',
      'bottom-tabs',
      'bottom-tabs-fab',
    ],
    default: 'stacked',
    cliFlag: 'layout',
    label: 'Layout',
    axis: 'layout',
    valueLabels: {
      stacked: 'Stacked (centered)',
      sidebar: 'Left sidebar',
      'topbar-sidebar': 'Top + sidebar',
      centered: 'Centered card',
      'mobile-drawer': 'Topbar + drawer (mobile)',
      'bottom-tabs': 'Bottom tabs (mobile)',
      'bottom-tabs-fab': 'Bottom tabs + FAB (mobile)',
    },
    /**
     * Cross-axis narrowing per platform.
     *
     *   - web / desktop: the 4 desktop layouts. `centered` doubles for
     *     auth shells on either platform.
     *   - mobile: the 3 mobile-shaped layouts plus `centered` (which is
     *     already mobile-friendly out of the box and pairs well with
     *     onboarding / auth flows).
     *
     * Sidebar / TopbarSidebar are intentionally absent from mobile —
     * they're physically unusable on a 375px viewport (we verified
     * earlier in the design phase).
     */
    valuesWhen: {
      web: ['stacked', 'sidebar', 'topbar-sidebar', 'centered'],
      desktop: ['stacked', 'sidebar', 'topbar-sidebar', 'centered'],
      mobile: ['centered', 'mobile-drawer', 'bottom-tabs', 'bottom-tabs-fab'],
    },
    /**
     * Per-platform default. Desktop apps overwhelmingly want a sidebar
     * (Linear / Notion / Supabase Studio shape); mobile apps default to
     * the most generic shape (drawer behind a hamburger). Web stays on
     * the original `stacked` to avoid changing existing behaviour.
     */
    defaultWhen: {
      web: 'stacked',
      desktop: 'sidebar',
      mobile: 'mobile-drawer',
    },
  },
  {
    id: 'ui',
    kind: 'enum',
    values: ['custom', 'shadcn', 'animate-ui'],
    default: 'animate-ui',
    cliFlag: 'ui',
    label: 'UI lib',
    axis: 'ui',
  },
  {
    id: 'toastPosition',
    kind: 'enum',
    values: ['top-right', 'top-center', 'bottom-center', 'bottom-right'],
    default: 'top-right',
    cliFlag: 'toast-position',
    label: 'Toast position',
    axis: 'ui',
    valueLabels: {
      'top-right': 'Top right',
      'top-center': 'Top center',
      'bottom-center': 'Bottom center',
      'bottom-right': 'Bottom right',
    },
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

// =================================================================================================
// Cross-axis helpers (platform-aware)
// =================================================================================================

/**
 * Type guard for the `platform` value. Returns the canonical value when the
 * input is a known platform, falls back to `'web'` otherwise — the schema's
 * `platform` default. Used by every helper below so callers can pass an
 * untyped `ParamValue` (e.g. straight from the store) without casting.
 */
export function coercePlatform(raw: unknown): Platform {
  if (typeof raw === 'string' && (PLATFORM_VALUES as readonly string[]).includes(raw)) {
    return raw as Platform;
  }
  return 'web';
}

/**
 * Whether `def` should be visible / accepted under the chosen `platform`.
 * Boolean and enum params alike read this. A param with no `availableWhen`
 * is universally available.
 */
export function isAvailable(def: ParamDef, platform: Platform): boolean {
  if (!def.availableWhen) return true;
  return def.availableWhen.platform.includes(platform);
}

/**
 * Per-platform narrowing of an enum's accepted values. Falls back to the
 * unconstrained `values` when the param has no `valuesWhen` keyed for this
 * platform — so the schema stays additive.
 */
export function getEffectiveValues(
  def: EnumParam,
  platform: Platform
): readonly string[] {
  return def.valuesWhen?.[platform] ?? def.values;
}

/**
 * Per-platform default override. Falls back to `def.default` when no
 * platform-specific default is declared. Used by the store on platform
 * switch and by the CLI command builder to elide redundant flags.
 *
 * Overload returns `string | boolean` matching the param's kind so callers
 * don't need to narrow the result themselves.
 */
export function getEffectiveDefault(
  def: BooleanParam,
  platform: Platform
): boolean;
export function getEffectiveDefault(
  def: EnumParam,
  platform: Platform
): string;
export function getEffectiveDefault(
  def: ParamDef,
  platform: Platform
): ParamValue;
export function getEffectiveDefault(
  def: ParamDef,
  platform: Platform
): ParamValue {
  if (def.kind === 'enum') {
    return def.defaultWhen?.[platform] ?? def.default;
  }
  return def.default;
}

/**
 * Validate (and coerce) an arbitrary value into the schema's expected type for
 * the given param. Returns `undefined` if the value cannot be accepted —
 * caller should fall back to the default.
 *
 * Optional `platform` narrows enum acceptance: when supplied, values rejected
 * by `valuesWhen` for that platform are dropped. Pass `undefined` to skip the
 * cross-axis check (the URL parser uses this to keep round-tripping lossless
 * when platform itself is mid-transition in the same query string).
 */
export function coerceValue(
  def: ParamDef,
  raw: unknown,
  platform?: Platform
): ParamValue | undefined {
  if (def.kind === 'boolean') {
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'string') {
      if (raw === 'on' || raw === 'true' || raw === '1') return true;
      if (raw === 'off' || raw === 'false' || raw === '0') return false;
    }
    return undefined;
  }
  if (typeof raw !== 'string') return undefined;
  const allowed = platform ? getEffectiveValues(def, platform) : def.values;
  return allowed.includes(raw) ? raw : undefined;
}
