/**
 * @file cli-prompts.ts
 * @description Interactive (and `--yes`/argv-driven) resolution of every
 * CLI answer: project name, feature flags, variant selections, package
 * manager, and the install/git booleans. Each resolver short-circuits on
 * an explicit argv value, then on `--yes`, and otherwise falls back to a
 * `@clack/prompts` question.
 *
 * Internal sibling of `index.ts`. The canonical value tables
 * (`VARIANT_CHOICES` / `PLATFORM_OVERRIDES`) live inline in `index.ts`
 * (the parity test parses them textually) and are threaded in here as
 * arguments rather than imported, keeping this module free of an import
 * cycle with the entry file.
 */

import { cancel, confirm, isCancel, log, select, text } from '@clack/prompts';
import kleur from 'kleur';

import type { ParsedArgs, PlatformValue, VariantAxis } from './cli-args.js';
import { DEFAULT_VARIANTS, type FeatureFlags, type VariantSelections } from './strip-features.js';
import { isValidPackageName, toValidPackageName } from './validate.js';

type PlatformOverride = {
  readonly values?: readonly string[];
  readonly default?: string;
};

export type VariantChoices = Record<VariantAxis, readonly string[]>;
export type PlatformOverrides = Record<
  Exclude<VariantAxis, 'platform'>,
  Partial<Record<PlatformValue, PlatformOverride>>
>;

function getEffectiveValues(
  axis: VariantAxis,
  platform: PlatformValue,
  choices: VariantChoices,
  overrides: PlatformOverrides
): readonly string[] {
  if (axis === 'platform') return choices.platform;
  const override = overrides[axis][platform];
  return override?.values ?? choices[axis];
}

function getEffectiveDefault(
  axis: VariantAxis,
  platform: PlatformValue,
  overrides: PlatformOverrides
): string {
  if (axis === 'platform') return DEFAULT_VARIANTS.platform!;
  const override = overrides[axis][platform];
  return override?.default ?? DEFAULT_VARIANTS[axis]!;
}

export async function promptProjectName(
  fromArgv: string | undefined,
  yes: boolean
): Promise<string> {
  if (fromArgv) {
    // `.` / `./` are passed through unchanged; resolveProjectTarget() turns
    // them into "scaffold into cwd" with a derived package name.
    if (isCwdShortcut(fromArgv)) return fromArgv;
    if (isValidPackageName(fromArgv)) return fromArgv;
    return toValidPackageName(fromArgv);
  }
  if (yes) return 'my-eikon-app';
  const name = await text({
    message: 'Project name (or "." to use the current directory):',
    placeholder: 'my-eikon-app',
    initialValue: 'my-eikon-app',
    validate(value) {
      if (!value) return 'Required.';
      if (isCwdShortcut(value)) return undefined;
      if (!isValidPackageName(value))
        return 'Must be a valid npm package name (lowercase, dashes, no spaces).';
      return undefined;
    },
  });
  if (isCancel(name)) {
    cancel('Aborted.');
    process.exit(1);
  }
  return name;
}

function isCwdShortcut(value: string): boolean {
  return value === '.' || value === './';
}

export async function resolveFeatures(argv: ParsedArgs): Promise<FeatureFlags> {
  const flags: FeatureFlags = { supabase: false };

  if (argv.supabase !== undefined) flags.supabase = argv.supabase;

  if (!argv.yes && argv.supabase === undefined) {
    const supabase = await select({
      message: 'Include Supabase (auth + db + storage) scaffolding?',
      initialValue: false as boolean,
      options: [
        { value: false, label: 'No — plain frontend only (recommended for new starters)' },
        { value: true, label: 'Yes — include @supabase/supabase-js + client scaffold' },
      ],
    });
    if (isCancel(supabase)) {
      cancel('Aborted.');
      process.exit(1);
    }
    flags.supabase = Boolean(supabase);
  }

  return flags;
}

export async function resolveVariants(
  argv: ParsedArgs,
  choices: VariantChoices,
  overrides: PlatformOverrides
): Promise<VariantSelections> {
  const out: VariantSelections = { ...DEFAULT_VARIANTS };
  // Resolve `platform` FIRST so subsequent axes can default / restrict
  // their accepted values per the chosen target. Order is enforced by
  // walking `Object.keys(choices)` which lists `platform` first.
  const axes = Object.keys(choices) as VariantAxis[];
  for (const axis of axes) {
    const platform = (out.platform ?? DEFAULT_VARIANTS.platform!) as PlatformValue;
    const allowed = getEffectiveValues(axis, platform, choices, overrides);
    const effDefault = getEffectiveDefault(axis, platform, overrides);

    // Snap any pre-set value (from --yes default-walk OR previous axis
    // resolution) into the per-platform allowed set. E.g. when the user
    // passes `--yes --platform mobile`, layout's seeded `'stacked'` would
    // be invalid for mobile and gets snapped to `'mobile-drawer'`.
    if (!allowed.includes(out[axis] ?? '')) {
      out[axis] = effDefault;
    }

    const fromArgv = argv.variants?.[axis];
    if (fromArgv !== undefined) {
      // Argv values bypass the prompt but still respect the per-platform
      // narrowing — pass through only if the user-supplied value is valid
      // for the chosen platform; otherwise keep the snapped default and
      // surface a one-line warning. Silent ignore would hide bugs.
      if (allowed.includes(fromArgv)) {
        out[axis] = fromArgv;
      } else {
        log.warn(
          `--${axis}=${kleur.yellow(fromArgv)} is not valid for platform=${platform}.` +
            ` Using ${kleur.cyan(effDefault)} instead.`
        );
      }
      continue;
    }
    if (argv.yes) continue;
    const choice = await select({
      message: `Choose a ${axis} variant:`,
      initialValue: out[axis] as string,
      options: allowed.map((value) => ({
        value,
        label: value === effDefault ? `${value} (default)` : value,
      })),
    });
    if (isCancel(choice)) {
      cancel('Aborted.');
      process.exit(1);
    }
    out[axis] = String(choice);
  }
  return out;
}

export async function resolvePackageManager(
  argv: ParsedArgs,
  variants: VariantSelections
): Promise<'pnpm' | 'npm' | 'bun'> {
  // Desktop / mobile shells live in `apps/*` and are wired up via
  // `pnpm-workspace.yaml` + `pnpm --filter` scripts in the root
  // package.json. Neither npm nor bun has a drop-in equivalent for
  // those filter calls, and rewriting the workspace topology to npm
  // workspaces / bun workspaces is out of scope. Snap to pnpm with a
  // visible warning so the user knows their `--pm` choice was overridden
  // rather than silently ignored.
  const platform = variants.platform;
  const requiresPnpm = platform === 'desktop' || platform === 'mobile';

  const snapIfNeeded = (chosen: 'pnpm' | 'npm' | 'bun'): 'pnpm' | 'npm' | 'bun' => {
    if (requiresPnpm && chosen !== 'pnpm') {
      log.warn(
        `--pm=${kleur.yellow(chosen)} is not supported for platform=${kleur.yellow(
          platform!
        )} — apps/${platform}/ uses pnpm workspaces. Falling back to ${kleur.cyan(
          'pnpm'
        )}.`
      );
      return 'pnpm';
    }
    return chosen;
  };

  if (argv.pm) return snapIfNeeded(argv.pm);
  if (argv.yes) return 'pnpm';
  const pm = await select({
    message: 'Package manager:',
    initialValue: 'pnpm' as 'pnpm' | 'npm' | 'bun',
    options: [
      { value: 'pnpm', label: 'pnpm (recommended)' },
      { value: 'npm', label: 'npm' },
      { value: 'bun', label: 'bun' },
    ],
  });
  if (isCancel(pm)) {
    cancel('Aborted.');
    process.exit(1);
  }
  return snapIfNeeded(pm);
}

export async function resolveBoolean(
  argv: ParsedArgs,
  key: 'install' | 'git',
  defaultValue: boolean,
  message: string
): Promise<boolean> {
  const fromArgv = argv[key];
  if (fromArgv !== undefined) return fromArgv;
  if (argv.yes) return defaultValue;
  const answer = await confirm({ message, initialValue: defaultValue });
  if (isCancel(answer)) {
    cancel('Aborted.');
    process.exit(1);
  }
  return Boolean(answer);
}
