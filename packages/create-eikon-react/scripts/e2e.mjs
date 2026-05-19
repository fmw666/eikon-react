// End-to-end test for create-eikon-react.
//
// What it does (in order):
//   1. Build the CLI (sync template + tsup).
//   2. `npm pack` the CLI to produce the same tarball npm publish would.
//   3. For each scenario:
//        a. Create a fresh temp directory.
//        b. Install the CLI from the tarball into a scratch project so we can
//           invoke its `bin` exactly the way `npx` does after a registry pull.
//        c. Run the CLI non-interactively with the scenario's flags.
//        d. Spot-check generated files (presence/absence) and package.json deps.
//        e. Unless --quick, run pnpm install / typecheck / test / build inside
//           the generated project to prove it actually runs.
//   4. Clean up unless --keep.
//
// Usage:
//   node scripts/e2e.mjs           # full e2e (slow, ~3-5 minutes)
//   node scripts/e2e.mjs --quick   # only verify scaffolding & stripping (~10s)
//   node scripts/e2e.mjs --keep    # do not delete temp directory at the end
//   node scripts/e2e.mjs --only lean   # run only the named scenario(s)

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(CLI_DIR, '..', '..');

const args = parseArgs(process.argv.slice(2));

const SCENARIOS = [
  {
    id: 'lean',
    projectName: 'eikon-e2e-lean',
    flags: ['--no-supabase', '--no-query'],
    expect: {
      filesPresent: ['src/features/counter/index.ts', '.agent/README.md'],
      filesAbsent: ['src/shared/supabase'],
      depsPresent: ['react', 'tailwindcss', 'motion'],
      depsAbsent: ['@supabase/supabase-js', '@tanstack/react-query'],
      providersContains: ['BrowserRouter', '<Toaster'],
      providersAbsent: ['QueryClient', '@tanstack/react-query'],
    },
  },
  {
    id: 'default',
    projectName: 'eikon-e2e-default',
    flags: ['--no-supabase', '--query'],
    expect: {
      filesPresent: ['src/features/counter/index.ts'],
      filesAbsent: ['src/shared/supabase'],
      depsPresent: ['@tanstack/react-query'],
      depsAbsent: ['@supabase/supabase-js'],
      providersContains: ['QueryClientProvider', '@tanstack/react-query'],
      providersAbsent: [],
    },
  },
  {
    id: 'full',
    projectName: 'eikon-e2e-full',
    flags: ['--supabase', '--query'],
    expect: {
      filesPresent: [
        'src/features/counter/index.ts',
        'src/shared/supabase/client.ts',
      ],
      filesAbsent: [],
      depsPresent: ['@supabase/supabase-js', '@tanstack/react-query'],
      depsAbsent: [],
      providersContains: ['QueryClientProvider'],
      providersAbsent: [],
    },
  },
  {
    // Same baseline as default but exercises every variant axis so the new
    // @eikon:variant(name=value) marker grammar is verified end-to-end.
    id: 'variants',
    projectName: 'eikon-e2e-variants',
    flags: [
      '--no-supabase',
      '--query',
      '--design',
      'minimal',
      '--layout',
      'sidebar',
      '--ui',
      'radix',
    ],
    expect: {
      filesPresent: ['src/features/counter/index.ts'],
      filesAbsent: ['src/shared/supabase'],
      depsPresent: ['@tanstack/react-query'],
      depsAbsent: ['@supabase/supabase-js'],
      providersContains: ['QueryClientProvider'],
      providersAbsent: [],
      // Strip-features must keep ONLY the chosen variant block in
      // RootLayout.tsx. The 'layout-stacked' fallback string at the end of
      // the `.at(0) ?? '…'` expression is intentional and survives stripping,
      // so we only assert that other non-chosen variants are gone.
      rootLayoutContains: ['layout-sidebar', '@eikon:variant(layout=sidebar)'],
      rootLayoutAbsent: [
        'layout-topbar',
        '@eikon:variant(layout=topbar)',
        '@eikon:variant(layout=stacked)',
      ],
      // The CSS file should keep the chosen design + ui blocks and drop the
      // non-chosen ones (the brutalist / default design palettes etc.).
      stylesContains: ['design=minimal', 'ui=radix', 'layout=sidebar'],
      stylesAbsent: ['design=default', 'design=brutalist', 'ui=animate-ui', 'ui=shadcn-style'],
    },
  },
];

const selected = args.only
  ? SCENARIOS.filter((s) => args.only.includes(s.id))
  : SCENARIOS;

if (selected.length === 0) {
  console.error(
    `[e2e] --only matched nothing. Available scenarios: ${SCENARIOS.map(
      (s) => s.id
    ).join(', ')}`
  );
  process.exit(1);
}

main().catch((err) => {
  console.error('[e2e] FAILED:', err);
  process.exit(1);
});

async function main() {
  const tmp = await mkdtemp(path.join(tmpdir(), 'eikon-e2e-'));
  console.log(`[e2e] workspace: ${tmp}`);
  console.log(`[e2e] mode: ${args.quick ? 'quick (no install/build)' : 'full'}`);
  console.log(
    `[e2e] scenarios: ${selected.map((s) => s.id).join(', ')}\n`
  );

  let tarballPath;

  try {
    step('Build CLI bundle + sync template payload');
    await run('pnpm', ['build'], CLI_DIR);

    step('npm pack CLI (simulates publish)');
    tarballPath = await packCli(tmp);
    console.log(`        -> ${path.basename(tarballPath)}`);

    for (const scenario of selected) {
      console.log(
        `\n[e2e] === scenario: ${scenario.id} ` +
          `(flags: ${scenario.flags.join(' ')}) ===`
      );
      await runScenario(scenario, tmp, tarballPath);
    }

    console.log(`\n[e2e] ALL PASSED (${selected.length} scenarios)`);
  } finally {
    if (args.keep) {
      console.log(`[e2e] --keep: leaving ${tmp} on disk`);
    } else {
      await rm(tmp, { recursive: true, force: true }).catch(() => {});
    }
  }
}

async function runScenario(scenario, tmpRoot, tarballPath) {
  const sandbox = path.join(tmpRoot, `sandbox-${scenario.id}`);
  await mkdir(sandbox, { recursive: true });

  // Stand up an empty npm project so we can `npm install --no-save` the tarball
  // and end up with a working `node_modules/.bin/create-eikon-react`. This is
  // closer to what `npx <pkg>` resolves to after a registry fetch than calling
  // dist/index.js directly.
  step('  install tarball into sandbox');
  await writeJson(path.join(sandbox, 'package.json'), {
    name: 'eikon-e2e-sandbox',
    version: '0.0.0',
    private: true,
  });
  await run('npm', ['install', '--no-save', '--silent', tarballPath], sandbox);

  const cliBin = path.join(
    sandbox,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'create-eikon-react.cmd' : 'create-eikon-react'
  );
  if (!existsSync(cliBin)) {
    throw new Error(`expected bin not found: ${cliBin}`);
  }

  step('  invoke CLI');
  await run(
    cliBin,
    [
      scenario.projectName,
      '--yes',
      ...scenario.flags,
      '--pm',
      'pnpm',
      '--no-install',
      '--no-git',
    ],
    sandbox
  );

  const projectDir = path.join(sandbox, scenario.projectName);
  if (!existsSync(projectDir)) {
    throw new Error(`CLI did not create ${projectDir}`);
  }

  step('  verify generated tree & deps');
  await verifyScenario(projectDir, scenario.expect);

  if (args.quick) {
    console.log('  (skipping install/test/build because --quick)');
    return;
  }

  step('  pnpm install (in generated project)');
  await run(
    'pnpm',
    ['install', '--prefer-offline', '--ignore-workspace'],
    projectDir
  );

  step('  pnpm typecheck');
  await run('pnpm', ['typecheck'], projectDir);

  step('  pnpm test');
  await run('pnpm', ['test'], projectDir);

  step('  pnpm lint');
  await run('pnpm', ['lint'], projectDir);

  step('  pnpm build');
  await run('pnpm', ['build'], projectDir);
}

async function verifyScenario(projectDir, expect) {
  for (const rel of expect.filesPresent) {
    if (!existsSync(path.join(projectDir, rel))) {
      throw new Error(`expected file present: ${rel}`);
    }
  }
  for (const rel of expect.filesAbsent) {
    if (existsSync(path.join(projectDir, rel))) {
      throw new Error(`expected file absent: ${rel}`);
    }
  }

  const pkg = JSON.parse(
    await readFile(path.join(projectDir, 'package.json'), 'utf8')
  );
  const allDeps = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };
  for (const dep of expect.depsPresent) {
    if (!(dep in allDeps)) {
      throw new Error(`expected dependency present: ${dep}`);
    }
  }
  for (const dep of expect.depsAbsent) {
    if (dep in allDeps) {
      throw new Error(`expected dependency absent: ${dep}`);
    }
  }

  const providers = await readFile(
    path.join(projectDir, 'src', 'app', 'providers.tsx'),
    'utf8'
  );
  for (const needle of expect.providersContains) {
    if (!providers.includes(needle)) {
      throw new Error(
        `expected providers.tsx to contain ${JSON.stringify(needle)}`
      );
    }
  }
  for (const needle of expect.providersAbsent) {
    if (providers.includes(needle)) {
      throw new Error(
        `expected providers.tsx to NOT contain ${JSON.stringify(needle)}`
      );
    }
  }

  if (expect.rootLayoutContains || expect.rootLayoutAbsent) {
    const root = await readFile(
      path.join(projectDir, 'src', 'app', 'layouts', 'RootLayout.tsx'),
      'utf8'
    );
    for (const needle of expect.rootLayoutContains ?? []) {
      if (!root.includes(needle)) {
        throw new Error(
          `expected RootLayout.tsx to contain ${JSON.stringify(needle)}`
        );
      }
    }
    for (const needle of expect.rootLayoutAbsent ?? []) {
      if (root.includes(needle)) {
        throw new Error(
          `expected RootLayout.tsx to NOT contain ${JSON.stringify(needle)}`
        );
      }
    }
  }

  if (expect.stylesContains || expect.stylesAbsent) {
    const styles = await readFile(
      path.join(projectDir, 'src', 'styles', 'index.css'),
      'utf8'
    );
    for (const needle of expect.stylesContains ?? []) {
      if (!styles.includes(needle)) {
        throw new Error(
          `expected styles/index.css to contain ${JSON.stringify(needle)}`
        );
      }
    }
    for (const needle of expect.stylesAbsent ?? []) {
      if (styles.includes(needle)) {
        throw new Error(
          `expected styles/index.css to NOT contain ${JSON.stringify(needle)}`
        );
      }
    }
  }
}

async function packCli(tmpDir) {
  const before = new Set(await listTarballs(tmpDir));
  await run('npm', ['pack', '--pack-destination', tmpDir, '--silent'], CLI_DIR);
  const after = await listTarballs(tmpDir);
  const created = after.find((f) => !before.has(f));
  if (!created) throw new Error('npm pack did not produce a tarball');
  return path.join(tmpDir, created);
}

async function listTarballs(dir) {
  const { readdir } = await import('node:fs/promises');
  try {
    return (await readdir(dir)).filter((f) => f.endsWith('.tgz'));
  } catch {
    return [];
  }
}

function run(cmd, cliArgs, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cliArgs, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, CI: '1' },
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${cliArgs.join(' ')} exited with ${code}`));
    });
  });
}

async function writeJson(filePath, obj) {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function step(label) {
  console.log(`[e2e] ${label}`);
}

function parseArgs(argv) {
  const out = { quick: false, keep: false, only: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--quick') out.quick = true;
    else if (a === '--keep') out.keep = true;
    else if (a === '--only') {
      const next = argv[++i];
      if (!next) throw new Error('--only requires a value');
      out.only = next.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (a.startsWith('--only=')) {
      out.only = a
        .slice('--only='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return out;
}

// Reference REPO_ROOT to keep it available for future test variants that may
// want to install pnpm from the workspace root, etc.
void REPO_ROOT;
