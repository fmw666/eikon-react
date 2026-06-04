import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cancel, confirm, intro, isCancel, note, outro } from '@clack/prompts';
import kleur from 'kleur';

import { parseArgs } from './cli-args.js';
import type { PlatformOverrides, VariantChoices } from './cli-prompts.js';
import {
  promptProjectName,
  resolveBoolean,
  resolveFeatures,
  resolvePackageManager,
  resolveVariants,
} from './cli-prompts.js';
import { resolveProjectTarget } from './resolve-target.js';
import { scaffold, type CliOptions } from './scaffold.js';

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
 *
 * NOTE: `VARIANT_CHOICES` and `PLATFORM_OVERRIDES` are parsed *textually*
 * from this file by `__tests__/cli-schema-parity.test.ts` — they must stay
 * inline here as object literals (do not extract to a sibling module).
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
    'cyberpunk',
    'terminal',
    'carbon',
    'editorial',
    'animal-crossing',
    'evomap',
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
  ui: ['custom', 'shadcn', 'animate-ui'] as const,
  toastPosition: ['top-right', 'top-center', 'bottom-center', 'bottom-right'] as const,
} satisfies VariantChoices;

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
const PLATFORM_OVERRIDES: PlatformOverrides = {
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
  const variants = await resolveVariants(argv, VARIANT_CHOICES, PLATFORM_OVERRIDES);
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

  await scaffold(opts, TEMPLATE_DIR);

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

run(process.argv.slice(2)).catch((err) => {
  console.error(kleur.red('\nUnexpected error:'), err);
  process.exit(1);
});
