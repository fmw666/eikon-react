import { mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  note,
  outro,
  select,
  spinner,
  text,
} from '@clack/prompts';
import kleur from 'kleur';

import { copyTemplate } from './copy-template.js';
import { initGit } from './init-git.js';
import { injectHtmlVariants } from './inject-html-variants.js';
import { installDeps } from './install-deps.js';
import { resolveProjectTarget } from './resolve-target.js';
import { rewritePackageManagerFields } from './rewrite-package-manager.js';
import {
  DEFAULT_VARIANTS,
  stripFeatures,
  type FeatureFlags,
  type VariantSelections,
} from './strip-features.js';
import { isValidPackageName, toValidPackageName } from './validate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_DIR = path.resolve(__dirname, '..', 'template');

/**
 * Known values for each variant axis. Kept in lock-step with the playground
 * schema at packages/preview-site/src/lib/params-schema.ts.
 *
 * Order matters for the interactive prompt: `platform` is asked FIRST so
 * that subsequent prompts can apply per-platform default/value overrides
 * declared in `PLATFORM_OVERRIDES` below.
 */
const VARIANT_CHOICES = {
  platform: ['web', 'desktop', 'mobile'] as const,
  design: [
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
  ] as const,
  layout: [
    'stacked',
    'sidebar',
    'topbar-sidebar',
    'centered',
    'mobile-drawer',
    'bottom-tabs',
    'bottom-tabs-fab',
  ] as const,
  ui: ['radix', 'shadcn-style', 'animate-ui'] as const,
  toastPosition: ['top-right', 'top-center', 'bottom-center', 'bottom-right'] as const,
} satisfies Record<string, readonly string[]>;

type VariantAxis = keyof typeof VARIANT_CHOICES;
type PlatformValue = (typeof VARIANT_CHOICES)['platform'][number];

const VARIANT_FLAG_ALIASES: Record<VariantAxis, readonly string[]> = {
  platform: ['platform'],
  design: ['design'],
  layout: ['layout'],
  ui: ['ui'],
  toastPosition: ['toastPosition', 'toast-position'],
};

/**
 * Per-platform narrowing of accepted values + default overrides. The
 * preview playground keeps the equivalent metadata on the schema's
 * `valuesWhen` / `defaultWhen` fields; the CLI inlines a stripped-down
 * mirror here because the CLI doesn't import the playground package.
 *
 * MUST stay in sync with packages/preview-site/src/lib/params-schema.ts.
 * The `skip-list-parity` test in __tests__/ would be the right place to
 * assert that synchronisation programmatically; for now the contract is
 * documented here and verified at e2e.
 */
type PlatformOverride = {
  readonly values?: readonly string[];
  readonly default?: string;
};

const PLATFORM_OVERRIDES: Record<
  Exclude<VariantAxis, 'platform'>,
  Partial<Record<PlatformValue, PlatformOverride>>
> = {
  layout: {
    // Web and desktop are restricted to the four desktop-shaped layouts —
    // the three mobile variants (mobile-drawer / bottom-tabs(-fab)) are
    // physically nonsensical on a desktop window. The schema declares the
    // same `valuesWhen` block for both platforms; the CLI parity test in
    // __tests__/cli-schema-parity.test.ts asserts the two stay aligned.
    web: {
      values: ['stacked', 'sidebar', 'topbar-sidebar', 'centered'],
      default: 'stacked',
    },
    desktop: {
      values: ['stacked', 'sidebar', 'topbar-sidebar', 'centered'],
      default: 'sidebar',
    },
    mobile: {
      values: ['centered', 'mobile-drawer', 'bottom-tabs', 'bottom-tabs-fab'],
      default: 'mobile-drawer',
    },
  },
  design: {},
  ui: {},
  toastPosition: {},
};

function getEffectiveValues(
  axis: VariantAxis,
  platform: PlatformValue
): readonly string[] {
  if (axis === 'platform') return VARIANT_CHOICES.platform;
  const override = PLATFORM_OVERRIDES[axis][platform];
  return override?.values ?? VARIANT_CHOICES[axis];
}

function getEffectiveDefault(
  axis: VariantAxis,
  platform: PlatformValue
): string {
  if (axis === 'platform') return DEFAULT_VARIANTS.platform!;
  const override = PLATFORM_OVERRIDES[axis][platform];
  return override?.default ?? DEFAULT_VARIANTS[axis]!;
}

interface CliOptions {
  targetDir: string;
  projectName: string;
  packageManager: 'pnpm' | 'npm' | 'bun';
  features: FeatureFlags;
  variants: VariantSelections;
  installDeps: boolean;
  initGit: boolean;
}

async function run(rawArgv: string[]): Promise<void> {
  const argv = parseArgs(rawArgv);

  console.log();
  intro(kleur.bgMagenta().black().bold(' create-eikon-react '));

  if (!existsSync(TEMPLATE_DIR)) {
    cancel(
      `Template directory not found at ${TEMPLATE_DIR}. ` +
        'The CLI bundle is missing its template payload.'
    );
    process.exit(1);
  }

  const rawName = await promptProjectName(argv.name, argv.yes);
  const { targetDir, projectName } = resolveProjectTarget(
    rawName,
    process.cwd()
  );
  const intoCwd = targetDir === path.resolve(process.cwd());

  if (existsSync(targetDir)) {
    const entries = await readdir(targetDir);
    if (entries.length > 0) {
      // `--yes .` is a legitimate "scaffold into this (non-empty) directory"
      // request; only abort non-interactively when the target is a *different*
      // non-empty directory.
      if (argv.yes && !intoCwd) {
        cancel(`Aborted: target directory ${targetDir} is not empty.`);
        process.exit(1);
      }
      if (!argv.yes) {
        const ok = await confirm({
          message: `${kleur.yellow(targetDir)} is not empty. Continue and merge into it?`,
          initialValue: false,
        });
        if (isCancel(ok) || !ok) {
          cancel('Aborted: target directory is not empty.');
          process.exit(1);
        }
      }
    }
  }

  const features = await resolveFeatures(argv);
  const variants = await resolveVariants(argv);
  const packageManager = await resolvePackageManager(argv, variants);
  const wantInstall = await resolveBoolean(
    argv,
    'install',
    true,
    `Install dependencies with ${kleur.cyan(packageManager)} now?`
  );
  const wantGit = await resolveBoolean(
    argv,
    'git',
    true,
    'Initialize a git repository?'
  );

  const opts: CliOptions = {
    targetDir,
    projectName,
    packageManager,
    features,
    variants,
    installDeps: wantInstall,
    initGit: wantGit,
  };

  await scaffold(opts);

  const cwdRel = path.relative(process.cwd(), opts.targetDir);
  const steps: string[] = [];
  let stepNum = 1;
  if (cwdRel !== '') {
    steps.push(`${kleur.gray(`${stepNum++}.`)} ${kleur.cyan(`cd ${cwdRel}`)}`);
  }
  if (!opts.installDeps) {
    steps.push(
      `${kleur.gray(`${stepNum++}.`)} ${kleur.cyan(`${opts.packageManager} install`)}`
    );
  }
  steps.push(
    `${kleur.gray(`${stepNum++}.`)} ${kleur.cyan(`${opts.packageManager} dev`)}`
  );

  note(steps.join('\n'), 'Next steps');
  outro(kleur.green('Done.') + ' Happy hacking!');
}

async function promptProjectName(
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

async function resolveFeatures(argv: ParsedArgs): Promise<FeatureFlags> {
  const flags: FeatureFlags = { supabase: false, i18n: true };

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

async function resolveVariants(argv: ParsedArgs): Promise<VariantSelections> {
  const out: VariantSelections = { ...DEFAULT_VARIANTS };
  // Resolve `platform` FIRST so subsequent axes can default / restrict
  // their accepted values per the chosen target. Order is enforced by
  // walking `Object.keys(VARIANT_CHOICES)` which lists `platform` first.
  const axes = Object.keys(VARIANT_CHOICES) as VariantAxis[];
  for (const axis of axes) {
    const platform = (out.platform ?? DEFAULT_VARIANTS.platform!) as PlatformValue;
    const allowed = getEffectiveValues(axis, platform);
    const effDefault = getEffectiveDefault(axis, platform);

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

async function resolvePackageManager(
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

async function resolveBoolean(
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

async function scaffold(opts: CliOptions): Promise<void> {
  const s = spinner();

  s.start('Copying template files');
  await mkdir(opts.targetDir, { recursive: true });
  await copyTemplate({
    src: TEMPLATE_DIR,
    dest: opts.targetDir,
    projectName: opts.projectName,
  });
  s.stop('Template copied');

  s.start('Applying feature selection');
  await stripFeatures(opts.targetDir, opts.features, opts.variants);
  s.stop('Feature selection applied');

  // Phase I: stamp the picked design / ui / layout onto `<html>` so the
  // first paint renders without a flash and the runtime initialisers in
  // `src/main.tsx` + `src/app/LayoutVariantContext.tsx` resolve to the
  // same value. `default` design / `animate-ui` ui collapse to no
  // class/data attrs, while `data-layout` is always stamped as the
  // layout Context's initial value.
  await injectHtmlVariants(opts.targetDir, opts.variants);

  // Re-flavour `package.json` for the chosen package manager. No-op on
  // pnpm (the template is already pnpm-flavoured); for npm/bun this
  // rewrites `engines`, `packageManager`, and any `pnpm run` callsites
  // in aggregate scripts (`check`, `ci`). Workspace-scoped scripts
  // (`tauri:*`, `cap:*`) are pnpm-only — `resolvePackageManager` snaps
  // `--pm` to pnpm on desktop/mobile so we never reach this with a
  // non-pnpm PM on those platforms.
  await rewritePackageManagerFields(opts.targetDir, opts.packageManager);

  if (opts.initGit) {
    s.start('Initializing git repository');
    try {
      await initGit(opts.targetDir);
      s.stop('Git repository initialized');
    } catch (err) {
      s.stop('Skipping git init (git not available or already initialized)');
      log.warn(String(err));
    }
  }

  if (opts.installDeps) {
    s.start(`Installing dependencies with ${opts.packageManager}`);
    try {
      await installDeps(opts.targetDir, opts.packageManager);
      s.stop('Dependencies installed');
    } catch (err) {
      s.stop(kleur.red('Dependency install failed'));
      log.error(String(err));
      log.info(
        `You can retry manually: ${kleur.cyan(
          `cd ${path.relative(process.cwd(), opts.targetDir)} && ${opts.packageManager} install`
        )}`
      );
    }
  }
}

interface ParsedArgs {
  name?: string;
  yes: boolean;
  supabase?: boolean;
  install?: boolean;
  git?: boolean;
  pm?: 'pnpm' | 'npm' | 'bun';
  variants?: Partial<Record<VariantAxis, string>>;
}

function parseArgs(argv: string[]): ParsedArgs {
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
    }
  }
  return out;
}

/**
 * Parse one of the variant flags (`--design / --layout / --ui`) in either
 * `--flag value` or `--flag=value` form. Returns true if the token belonged to
 * a known variant axis (and was therefore consumed) regardless of whether the
 * value was valid; invalid values are silently ignored so unknown values still
 * fall through to the interactive prompt or the default.
 */
function tryParseVariant(
  token: string,
  argv: string[],
  i: number,
  out: ParsedArgs
): boolean {
  const axes = Object.keys(VARIANT_CHOICES) as VariantAxis[];
  for (const axis of axes) {
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
      if (
        value !== undefined &&
        (VARIANT_CHOICES[axis] as readonly string[]).includes(value)
      ) {
        out.variants ??= {};
        out.variants[axis] = value;
      }
      return true;
    }
  }
  return false;
}

run(process.argv.slice(2)).catch((err) => {
  console.error(kleur.red('\nUnexpected error:'), err);
  process.exit(1);
});
