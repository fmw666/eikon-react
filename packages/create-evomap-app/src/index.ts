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
import { installDeps } from './install-deps.js';
import { stripFeatures, type FeatureFlags } from './strip-features.js';
import { isValidPackageName, toValidPackageName } from './validate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_DIR = path.resolve(__dirname, '..', 'template');

interface CliOptions {
  targetDir: string;
  projectName: string;
  packageManager: 'pnpm' | 'npm' | 'bun';
  features: FeatureFlags;
  installDeps: boolean;
  initGit: boolean;
}

async function run(rawArgv: string[]): Promise<void> {
  const argv = parseArgs(rawArgv);

  console.log();
  intro(kleur.bgMagenta().black().bold(' create-evomap-app '));

  if (!existsSync(TEMPLATE_DIR)) {
    cancel(
      `Template directory not found at ${TEMPLATE_DIR}. ` +
        'The CLI bundle is missing its template payload.'
    );
    process.exit(1);
  }

  const projectName = await promptProjectName(argv.name, argv.yes);
  const targetDir = path.resolve(process.cwd(), projectName);

  if (existsSync(targetDir)) {
    const entries = await readdir(targetDir);
    if (entries.length > 0) {
      if (argv.yes) {
        cancel(`Aborted: target directory ${targetDir} is not empty.`);
        process.exit(1);
      }
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

  const features = await resolveFeatures(argv);
  const packageManager = await resolvePackageManager(argv);
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
    installDeps: wantInstall,
    initGit: wantGit,
  };

  await scaffold(opts);

  const cwdRel = path.relative(process.cwd(), opts.targetDir) || '.';
  const nextSteps = [
    `${kleur.gray('1.')} ${kleur.cyan(`cd ${cwdRel}`)}`,
    opts.installDeps
      ? null
      : `${kleur.gray('2.')} ${kleur.cyan(`${opts.packageManager} install`)}`,
    `${kleur.gray(opts.installDeps ? '2.' : '3.')} ${kleur.cyan(
      `${opts.packageManager} dev`
    )}`,
  ]
    .filter(Boolean)
    .join('\n');

  note(nextSteps, 'Next steps');
  outro(kleur.green('Done.') + ' Happy hacking!');
}

async function promptProjectName(
  fromArgv: string | undefined,
  yes: boolean
): Promise<string> {
  if (fromArgv) {
    if (isValidPackageName(fromArgv)) return fromArgv;
    return toValidPackageName(fromArgv);
  }
  if (yes) return 'my-evomap-app';
  const name = await text({
    message: 'Project name (will also be the directory name):',
    placeholder: 'my-evomap-app',
    initialValue: 'my-evomap-app',
    validate(value) {
      if (!value) return 'Required.';
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

async function resolveFeatures(argv: ParsedArgs): Promise<FeatureFlags> {
  const flags: FeatureFlags = { supabase: false, query: true, i18n: true };

  if (argv.supabase !== undefined) flags.supabase = argv.supabase;
  if (argv.query !== undefined) flags.query = argv.query;

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

  if (!argv.yes && argv.query === undefined) {
    const query = await select({
      message: 'Include TanStack Query (server-state)?',
      initialValue: true as boolean,
      options: [
        { value: true, label: 'Yes — recommended for any project that fetches data' },
        { value: false, label: 'No — keep the bundle lean' },
      ],
    });
    if (isCancel(query)) {
      cancel('Aborted.');
      process.exit(1);
    }
    flags.query = Boolean(query);
  }

  return flags;
}

async function resolvePackageManager(
  argv: ParsedArgs
): Promise<'pnpm' | 'npm' | 'bun'> {
  if (argv.pm) return argv.pm;
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
  return pm;
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
  await stripFeatures(opts.targetDir, opts.features);
  s.stop('Feature selection applied');

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
  query?: boolean;
  install?: boolean;
  git?: boolean;
  pm?: 'pnpm' | 'npm' | 'bun';
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { yes: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '-y' || a === '--yes') out.yes = true;
    else if (a === '--supabase') out.supabase = true;
    else if (a === '--no-supabase') out.supabase = false;
    else if (a === '--query') out.query = true;
    else if (a === '--no-query') out.query = false;
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
    } else if (!a.startsWith('-') && out.name === undefined) {
      out.name = a;
    }
  }
  return out;
}

run(process.argv.slice(2)).catch((err) => {
  console.error(kleur.red('\nUnexpected error:'), err);
  process.exit(1);
});
