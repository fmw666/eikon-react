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
    // Default scaffold (platform=web, supabase off). TanStack Query is
    // baseline infrastructure now — every scaffold ships with it — so
    // this scenario doubles as the canonical "web minimal" smoke test:
    // it covers the web-specific stripping (no PWA meta, no capacitor
    // mode, no mobile safe-area utilities) alongside the dependency
    // assertions.
    id: 'default',
    projectName: 'eikon-e2e-default',
    flags: ['--no-supabase'],
    expect: {
      filesPresent: ['src/features/counter/index.ts', '.agent/README.md'],
      // The `examples` feature is a DEV-only template showcase that the
      // CLI strips from EVERY scaffold regardless of flags — there is
      // intentionally no `--examples` opt-in. Its two runtime deps
      // (web-vitals, @tanstack/react-virtual) are pruned in lock-step.
      // platform=web (default) also drops the mobile-drawer Sheet
      // primitive and the `apps/*` workspace declaration.
      filesAbsent: [
        'src/shared/supabase',
        'src/features/examples',
        'src/shared/ui/sheet.tsx',
        'pnpm-workspace.yaml',
      ],
      depsPresent: [
        'react',
        'tailwindcss',
        'motion',
        '@tanstack/react-query',
      ],
      depsAbsent: [
        '@supabase/supabase-js',
        '@tanstack/react-virtual',
        'web-vitals',
      ],
      providersContains: [
        'BrowserRouter',
        '<Toaster',
        'QueryClientProvider',
        '@tanstack/react-query',
      ],
      providersAbsent: [],
      // Platform=web must not carry mobile-only PWA meta tags, CSS
      // tokens / utilities, or the capacitor mode branch in vite.
      htmlAbsent: [
        'apple-mobile-web-app-capable',
        'apple-mobile-web-app-status-bar-style',
        'mobile-web-app-capable',
      ],
      htmlContains: ['viewport-fit=cover'],
      stylesAbsent: ['--touch-target-min', '@utility safe-pt', '@utility safe-pb'],
      viteContains: ['_mode'],
      viteAbsent: ["'capacitor'", "mode === 'capacitor'"],
    },
  },
  {
    id: 'full',
    projectName: 'eikon-e2e-full',
    flags: ['--supabase'],
    expect: {
      filesPresent: [
        'src/features/counter/index.ts',
        'src/shared/supabase/client.ts',
      ],
      filesAbsent: ['src/features/examples'],
      depsPresent: ['@supabase/supabase-js', '@tanstack/react-query'],
      depsAbsent: ['@tanstack/react-virtual', 'web-vitals'],
      providersContains: ['QueryClientProvider'],
      providersAbsent: [],
    },
  },
  {
    // Platform=desktop scenario. Asserts the Tauri 2 shell survives, the
    // Capacitor shell is gone, package.json's tauri:* scripts are kept,
    // cap:* scripts are dropped, and __PROJECT_NAME__ is substituted.
    id: 'desktop',
    projectName: 'eikon-e2e-desktop',
    flags: ['--platform', 'desktop'],
    expect: {
      filesPresent: [
        'apps/desktop/src-tauri/Cargo.toml',
        'apps/desktop/src-tauri/tauri.conf.json',
        'apps/desktop/src-tauri/src/main.rs',
        'apps/desktop/package.json',
        // pnpm-workspace.yaml MUST survive on desktop — `tauri:dev` /
        // `tauri:build` rely on `pnpm --filter "./apps/desktop"`.
        'pnpm-workspace.yaml',
      ],
      // Desktop is still a "no mobile-drawer" scaffold (default layout
      // is sidebar), so sheet.tsx is gone. Mobile-only PWA / safe-area
      // / capacitor content is also dropped.
      filesAbsent: [
        'apps/mobile',
        'src/features/examples',
        'src/shared/supabase',
        'src/shared/ui/sheet.tsx',
      ],
      depsPresent: ['react'],
      depsAbsent: ['@supabase/supabase-js'],
      providersContains: [],
      providersAbsent: [],
      scriptsPresent: ['tauri', 'tauri:dev', 'tauri:build'],
      scriptsAbsent: ['cap', 'cap:sync', 'cap:add:ios', 'cap:add:android'],
      htmlAbsent: ['apple-mobile-web-app-capable', 'mobile-web-app-capable'],
      stylesAbsent: ['--touch-target-min', '@utility safe-pt'],
      viteAbsent: ["'capacitor'"],
      // Tauri config files use __PROJECT_NAME__ as a placeholder that
      // copyTemplate() rewrites to the chosen project name. Verify both
      // the substitution AND that the literal placeholder is gone.
      tauriConfContains: ['"productName": "eikon-e2e-desktop"'],
      tauriConfAbsent: ['__PROJECT_NAME__'],
      // Cargo.toml's `[package].name` is now the bare project name (no
      // `_app` suffix). The cdylib's `[lib].name` stays at `app_lib` so
      // main.rs's `app_lib::run()` continues to compile post-strip.
      cargoTomlContains: [
        'name = "eikon-e2e-desktop"',
        'name = "app_lib"',
      ],
      cargoTomlAbsent: ['__PROJECT_NAME__', 'eikon-e2e-desktop_app'],
    },
  },
  {
    // Platform=mobile scenario. Asserts the Capacitor shell survives,
    // the Tauri shell is gone, cap:* scripts kept, tauri:* dropped, and
    // __PROJECT_NAME__ substituted in capacitor.config.ts.
    id: 'mobile',
    projectName: 'eikon-e2e-mobile',
    flags: ['--platform', 'mobile'],
    expect: {
      filesPresent: [
        'apps/mobile/capacitor.config.ts',
        'apps/mobile/package.json',
        // Mobile defaults to layout=mobile-drawer, which IS the only
        // layout that uses src/shared/ui/sheet.tsx — so the file
        // must survive the strip pass on this scenario.
        'src/shared/ui/sheet.tsx',
        // Mobile uses pnpm --filter "./apps/mobile" for cap:* scripts.
        'pnpm-workspace.yaml',
      ],
      filesAbsent: ['apps/desktop', 'src/features/examples', 'src/shared/supabase'],
      depsPresent: ['react'],
      depsAbsent: ['@supabase/supabase-js'],
      providersContains: [],
      providersAbsent: [],
      scriptsPresent: ['cap', 'cap:sync', 'cap:add:ios', 'cap:add:android'],
      scriptsAbsent: ['tauri', 'tauri:dev', 'tauri:build'],
      capacitorConfContains: ["appId: 'app.eikon.eikon-e2e-mobile'"],
      capacitorConfAbsent: ['__PROJECT_NAME__'],
      // Mobile keeps every mobile-only adaptation: PWA meta, safe-area
      // utilities, touch-target token, capacitor base branch.
      htmlContains: [
        'apple-mobile-web-app-capable',
        'mobile-web-app-capable',
        'viewport-fit=cover',
      ],
      stylesContains: ['--touch-target-min', '@utility safe-pt', '@utility safe-pb'],
      viteContains: ["_mode === 'capacitor'"],
      // Mobile platform also forces a mobile-default layout (`mobile-drawer`)
      // when the user doesn't specify one. The dispatcher should keep
      // only that variant block.
      rootLayoutContains: [
        'MobileDrawerRootLayout',
        '@eikon:variant(layout=mobile-drawer)',
      ],
      rootLayoutAbsent: [
        '@eikon:variant(layout=stacked)',
        '@eikon:variant(layout=sidebar)',
        'StackedRootLayout',
        'SidebarRootLayout',
      ],
    },
  },
  {
    // Same baseline as default but exercises every variant axis so the new
    // @eikon:variant(name=value) marker grammar is verified end-to-end.
    id: 'variants',
    projectName: 'eikon-e2e-variants',
    flags: [
      '--no-supabase',
      '--design',
      'linear',
      '--layout',
      'sidebar',
      '--ui',
      'radix',
      '--toast-position',
      'bottom-center',
    ],
    expect: {
      filesPresent: [
        'src/features/counter/index.ts',
        'src/shared/ui/toaster.tsx',
      ],
      filesAbsent: [
        'src/shared/supabase',
        // examples is always stripped — see comment on the lean scenario.
        'src/features/examples',
        // The toaster/ directory no longer exists — toast is a single file.
        'src/shared/ui/toaster',
        // layout=sidebar means the mobile-drawer Sheet primitive is dead.
        'src/shared/ui/sheet.tsx',
        // platform defaults to web here, so the workspace yaml is dropped.
        'pnpm-workspace.yaml',
      ],
      depsPresent: ['@tanstack/react-query'],
      depsAbsent: [
        '@supabase/supabase-js',
        '@tanstack/react-virtual',
        'web-vitals',
      ],
      providersContains: ['QueryClientProvider'],
      providersAbsent: [],
      // Strip-features must keep ONLY the chosen variant block in
      // RootLayout.tsx. The dispatcher imports each sibling layout by
      // PascalCase name (SidebarRootLayout / StackedRootLayout / …), so
      // the surviving import is the most precise post-strip witness.
      rootLayoutContains: [
        'SidebarRootLayout',
        '@eikon:variant(layout=sidebar)',
      ],
      rootLayoutAbsent: [
        'StackedRootLayout',
        'TopbarSidebarRootLayout',
        'CenteredRootLayout',
        '@eikon:variant(layout=stacked)',
        '@eikon:variant(layout=topbar-sidebar)',
        '@eikon:variant(layout=centered)',
      ],
      // The toaster.tsx must keep ONLY the chosen position's variant block
      // and strip the others.
      toasterContains: [
        '@eikon:variant(toastPosition=bottom-center)',
        "'bottom-center'",
      ],
      toasterAbsent: [
        '@eikon:variant(toastPosition=top-right)',
        '@eikon:variant(toastPosition=top-center)',
        '@eikon:variant(toastPosition=bottom-right)',
      ],
      // The CSS file should keep the chosen design + ui blocks and drop
      // the non-chosen ones (the default / apple / anthropic / vercel /
      // notion design palettes etc.). The CSS file has no `layout=` or
      // `toastPosition=` markers — those axes live in JSX / TSX files.
      stylesContains: ['design=linear', 'ui=radix'],
      stylesAbsent: [
        'design=default',
        'design=apple',
        'design=anthropic',
        'design=vercel',
        'design=notion',
        'ui=animate-ui',
        'ui=shadcn-style',
      ],
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
  // Honour the generated project's `pnpm-workspace.yaml` — desktop / mobile
  // scaffolds depend on `apps/*` being recognised as workspace packages so
  // that `tauri:dev` / `cap:sync` resolve via `pnpm --filter "./apps/<x>"`.
  // `--prefer-offline` is kept; we deliberately do NOT pass
  // `--ignore-workspace` (an earlier iteration did, which silently masked
  // a missing workspace file in the template).
  await run('pnpm', ['install', '--prefer-offline'], projectDir);

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

  // index.html is gated by `@eikon:variant(platform=…)` block markers —
  // mobile-only PWA meta tags must vanish on web/desktop scaffolds.
  if (expect.htmlContains || expect.htmlAbsent) {
    const html = await readFile(path.join(projectDir, 'index.html'), 'utf8');
    for (const needle of expect.htmlContains ?? []) {
      if (!html.includes(needle)) {
        throw new Error(
          `expected index.html to contain ${JSON.stringify(needle)}`
        );
      }
    }
    for (const needle of expect.htmlAbsent ?? []) {
      if (html.includes(needle)) {
        throw new Error(
          `expected index.html to NOT contain ${JSON.stringify(needle)}`
        );
      }
    }
  }

  // vite.config.ts: the capacitor base branch is stripped on non-mobile
  // scaffolds, leaving the parameter destructure (`mode: _mode`) intact
  // so the unused-parameter lint stays quiet.
  if (expect.viteContains || expect.viteAbsent) {
    const vite = await readFile(
      path.join(projectDir, 'vite.config.ts'),
      'utf8'
    );
    for (const needle of expect.viteContains ?? []) {
      if (!vite.includes(needle)) {
        throw new Error(
          `expected vite.config.ts to contain ${JSON.stringify(needle)}`
        );
      }
    }
    for (const needle of expect.viteAbsent ?? []) {
      if (vite.includes(needle)) {
        throw new Error(
          `expected vite.config.ts to NOT contain ${JSON.stringify(needle)}`
        );
      }
    }
  }

  if (expect.toasterContains || expect.toasterAbsent) {
    const toaster = await readFile(
      path.join(projectDir, 'src', 'shared', 'ui', 'toaster.tsx'),
      'utf8'
    );
    for (const needle of expect.toasterContains ?? []) {
      if (!toaster.includes(needle)) {
        throw new Error(
          `expected toaster.tsx to contain ${JSON.stringify(needle)}`
        );
      }
    }
    for (const needle of expect.toasterAbsent ?? []) {
      if (toaster.includes(needle)) {
        throw new Error(
          `expected toaster.tsx to NOT contain ${JSON.stringify(needle)}`
        );
      }
    }
  }

  if (expect.scriptsPresent || expect.scriptsAbsent) {
    const scripts = pkg.scripts ?? {};
    for (const name of expect.scriptsPresent ?? []) {
      if (!(name in scripts)) {
        throw new Error(`expected package.json script present: ${name}`);
      }
    }
    for (const name of expect.scriptsAbsent ?? []) {
      if (name in scripts) {
        throw new Error(`expected package.json script absent: ${name}`);
      }
    }
  }

  if (expect.tauriConfContains || expect.tauriConfAbsent) {
    const conf = await readFile(
      path.join(projectDir, 'apps', 'desktop', 'src-tauri', 'tauri.conf.json'),
      'utf8'
    );
    for (const needle of expect.tauriConfContains ?? []) {
      if (!conf.includes(needle)) {
        throw new Error(
          `expected tauri.conf.json to contain ${JSON.stringify(needle)}`
        );
      }
    }
    for (const needle of expect.tauriConfAbsent ?? []) {
      if (conf.includes(needle)) {
        throw new Error(
          `expected tauri.conf.json to NOT contain ${JSON.stringify(needle)}`
        );
      }
    }
  }

  if (expect.cargoTomlContains || expect.cargoTomlAbsent) {
    const cargoToml = await readFile(
      path.join(projectDir, 'apps', 'desktop', 'src-tauri', 'Cargo.toml'),
      'utf8'
    );
    for (const needle of expect.cargoTomlContains ?? []) {
      if (!cargoToml.includes(needle)) {
        throw new Error(
          `expected Cargo.toml to contain ${JSON.stringify(needle)}`
        );
      }
    }
    for (const needle of expect.cargoTomlAbsent ?? []) {
      if (cargoToml.includes(needle)) {
        throw new Error(
          `expected Cargo.toml to NOT contain ${JSON.stringify(needle)}`
        );
      }
    }
  }

  if (expect.capacitorConfContains || expect.capacitorConfAbsent) {
    const conf = await readFile(
      path.join(projectDir, 'apps', 'mobile', 'capacitor.config.ts'),
      'utf8'
    );
    for (const needle of expect.capacitorConfContains ?? []) {
      if (!conf.includes(needle)) {
        throw new Error(
          `expected capacitor.config.ts to contain ${JSON.stringify(needle)}`
        );
      }
    }
    for (const needle of expect.capacitorConfAbsent ?? []) {
      if (conf.includes(needle)) {
        throw new Error(
          `expected capacitor.config.ts to NOT contain ${JSON.stringify(needle)}`
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
