/**
 * @file cli-args.ts
 * @description argv parsing for the `create-eikon-react` CLI. Owns the
 * `ParsedArgs` shape, the flag grammar (boolean flags + `--pm` +
 * `--<axis>` variant flags), and the "unknown flag → did you mean"
 * suggestion path. Kept as an internal sibling of `index.ts`; the entry
 * file imports `parseArgs` + `ParsedArgs` and is otherwise unchanged.
 *
 * The variant axes are mirrored here as a string-literal union; the
 * canonical value tables (`VARIANT_CHOICES` / `PLATFORM_OVERRIDES`) stay
 * inline in `index.ts` because the CLI ↔ schema parity test parses them
 * textually from that file.
 */

import kleur from 'kleur';

export type VariantAxis = 'platform' | 'design' | 'layout' | 'ui' | 'toastPosition';
export type PlatformValue = 'web' | 'desktop' | 'mobile';

export const VARIANT_FLAG_ALIASES: Record<VariantAxis, readonly string[]> = {
  platform: ['platform'],
  design: ['design'],
  layout: ['layout'],
  ui: ['ui'],
  toastPosition: ['toastPosition', 'toast-position'],
};

const VARIANT_AXES = Object.keys(VARIANT_FLAG_ALIASES) as VariantAxis[];

export interface ParsedArgs {
  name?: string;
  yes: boolean;
  supabase?: boolean;
  install?: boolean;
  git?: boolean;
  pm?: 'pnpm' | 'npm' | 'bun';
  variants?: Partial<Record<VariantAxis, string>>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { yes: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '-y' || a === '--yes') out.yes = true;
    else if (a === '--supabase') out.supabase = true;
    else if (a === '--no-supabase') out.supabase = false;
    else if (a === '--install') out.install = true;
    else if (a === '--no-install') out.install = false;
    else if (a === '--git') out.git = true;
    else if (a === '--no-git') out.git = false;
    else if (a === '--pm') {
      const next = argv[++i];
      if (next === 'pnpm' || next === 'npm' || next === 'bun') out.pm = next;
    } else if (a.startsWith('--pm=')) {
      const v = a.slice('--pm='.length);
      if (v === 'pnpm' || v === 'npm' || v === 'bun') out.pm = v;
    } else if (tryParseVariant(a, argv, i, out)) {
      // `tryParseVariant` consumes one or two argv positions and updates `out`.
      if (a.indexOf('=') === -1) i += 1;
    } else if (!a.startsWith('-') && out.name === undefined) {
      out.name = a;
    } else if (a.startsWith('-')) {
      reportUnknownFlag(a);
    }
  }
  return out;
}

/**
 * Every long-form flag the CLI recognises. Used to suggest a "did you
 * mean" candidate when the user typo's a flag name. Variant flags come
 * straight from `VARIANT_FLAG_ALIASES` so a future axis automatically
 * lands in the suggestion set without a second touch-point here.
 */
function knownFlags(): readonly string[] {
  const variantFlags: string[] = [];
  for (const axis of VARIANT_AXES) {
    for (const alias of VARIANT_FLAG_ALIASES[axis]) {
      variantFlags.push(`--${alias}`);
    }
  }
  return [
    '--yes',
    '-y',
    '--supabase',
    '--no-supabase',
    '--install',
    '--no-install',
    '--git',
    '--no-git',
    '--pm',
    ...variantFlags,
  ];
}

/**
 * Print a clear "Unknown flag: --x. Did you mean --y?" and exit non-zero.
 * The previous behaviour silently ignored typos, which meant
 * `create-eikon-react my-app --platfrom=mobile` ran as `web` with no
 * indication anything had gone wrong — the user thought they'd asked
 * for mobile and didn't notice until much later.
 */
function reportUnknownFlag(typed: string): never {
  const flagOnly = typed.split('=')[0]!;
  const candidates = knownFlags();
  let best: { flag: string; dist: number } | null = null;
  for (const cand of candidates) {
    const d = levenshtein(flagOnly, cand);
    if (best === null || d < best.dist) best = { flag: cand, dist: d };
  }
  console.error(kleur.red(`Unknown flag: ${flagOnly}`));
  if (best && best.dist <= Math.max(2, Math.floor(flagOnly.length / 3))) {
    console.error(`Did you mean ${kleur.cyan(best.flag)}?`);
  }
  console.error(`Run ${kleur.cyan('create-eikon-react --help')} to see all flags.`);
  process.exit(1);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]!;
  }
  return prev[b.length]!;
}

/**
 * Parse one of the variant flags (`--design / --layout / --ui`) in either
 * `--flag value` or `--flag=value` form. Returns true if the token belonged
 * to a known variant axis (and was therefore consumed) regardless of
 * whether the value was valid.
 *
 * Always records the typed value when one was supplied (skipping only
 * tokens shaped like another flag, e.g. `--ui --design`), so
 * `resolveVariants` can produce a single, descriptive warning naming the
 * value, the axis, and the chosen default — visible in `--yes` mode
 * where there's no interactive re-prompt to soften the failure.
 */
function tryParseVariant(
  token: string,
  argv: string[],
  i: number,
  out: ParsedArgs
): boolean {
  for (const axis of VARIANT_AXES) {
    for (const alias of VARIANT_FLAG_ALIASES[axis]) {
      const longFlag = `--${alias}`;
      let value: string | undefined;
      if (token === longFlag) {
        value = argv[i + 1];
      } else if (token.startsWith(`${longFlag}=`)) {
        value = token.slice(longFlag.length + 1);
      } else {
        continue;
      }
      if (value !== undefined && !value.startsWith('-')) {
        out.variants ??= {};
        out.variants[axis] = value;
      }
      return true;
    }
  }
  return false;
}
