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
      filesPresent: [
        'src/features/counter/index.ts',
        '.agent/README.md',
        // The `examples` feature is a DEV-only template showcase that
        // ships with EVERY scaffold. Production bundles stay clean via
        // the runtime `import.meta.env.DEV` gate in `app/router.tsx`,
        // not via scaffold-time stripping. Its two showcase deps
        // (web-vitals, @tanstack/react-virtual) ride along.
        'src/features/examples',
      ],
      // platform=web (default) drops the mobile-drawer Sheet primitive
      // and the `apps/*` workspace declaration.
      filesAbsent: [
        'src/shared/supabase',
        'src/shared/ui/sheet.tsx',
        'pnpm-workspace.yaml',
      ],
      depsPresent: [
        'react',
        'tailwindcss',
        'motion',
        '@tanstack/react-query',
        // showcase deps — kept in lock-step with src/features/examples
        '@tanstack/react-virtual',
        'web-vitals',
      ],
      depsAbsent: ['@supabase/supabase-js'],
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
        'src/features/examples',
      ],
      filesAbsent: [],
      depsPresent: [
        '@supabase/supabase-js',
        '@tanstack/react-query',
        '@tanstack/react-virtual',
        'web-vitals',
      ],
      depsAbsent: [],
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
      filesAbsent: ['apps/desktop', 'src/shared/supabase'],
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
      'custom',
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
        // The toaster/ directory no longer exists — toast is a single file.
        'src/shared/ui/toaster',
        // layout=sidebar means the mobile-drawer Sheet primitive is dead.
        'src/shared/ui/sheet.tsx',
        // platform defaults to web here, so the workspace yaml is dropped.
        'pnpm-workspace.yaml',
      ],
      depsPresent: ['@tanstack/react-query'],
      depsAbsent: ['@supabase/supabase-js'],
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
      // The CSS file should keep the chosen design block and drop the
      // non-chosen design palettes. The `ui` axis no longer emits CSS
      // markers — it's a scaffold-time file swap, asserted under the
      // `variants-shadcn` / `variants-animate-ui` scenarios via the
      // `src/shared/ui/*` layout itself.
      stylesContains: ['design=linear'],
      stylesAbsent: [
        'design=default',
        'design=apple',
        'design=anthropic',
        'design=vercel',
        'design=notion',
        'ui=animate-ui',
        'ui=shadcn',
        'ui=custom',
      ],
      // --ui custom keeps the project-authored Radix wrappers — the
      // template's own button.tsx ships unchanged. `sheet.tsx` is
      // omitted here because layout=sidebar strips it (already covered
      // in `filesAbsent` above).
      uiFilesPresent: [
        'src/shared/ui/button.tsx',
        'src/shared/ui/dialog.tsx',
        'src/shared/ui/tabs.tsx',
        'src/shared/ui/command.tsx',
        'src/shared/ui/card.tsx',
        'src/shared/ui/toaster.tsx',
        'src/shared/ui/theme-toggle.tsx',
        'src/shared/ui/language-switcher.tsx',
      ],
      // No components.json on --ui custom (it's a shadcn/animate-ui artefact).
      filesAbsentExtra: ['components.json'],
    },
  },
  {
    // --ui shadcn lays down the official shadcn registry components from
    // template-snapshots/shadcn/. The seven project-authored primitives
    // are deleted then refilled from the snapshot; theme-toggle /
    // language-switcher survive untouched because they live outside
    // `REPLACEABLE_UI_FILES`.
    id: 'variants-shadcn',
    projectName: 'eikon-e2e-variants-shadcn',
    flags: ['--no-supabase', '--ui', 'shadcn'],
    expect: {
      filesPresent: [
        'src/features/counter/index.ts',
        // components.json is shipped alongside the snapshot so future
        // `shadcn add` runs in the user's project Just Work.
        'components.json',
      ],
      filesAbsent: [
        'src/shared/supabase',
        'pnpm-workspace.yaml',
        // sheet.tsx carries `@eikon:variant(layout=mobile-drawer) file`,
        // so on the default desktop-app-shell layout the strip pass
        // removes it BEFORE applyUiSnapshot runs. Survivor-gating
        // (apply-ui-snapshot.ts) refuses to resurrect a primitive whose
        // template counterpart didn't survive — the snapshot's
        // `sheet.tsx` would import dead code, so it stays absent.
        'src/shared/ui/sheet.tsx',
      ],
      // shadcn pulls in `radix-ui` (the unified package) + `cmdk` +
      // `next-themes` + `sonner` via the registry. These come from the
      // snapshot's package-deps.json — assert at least the most
      // distinctive ones.
      depsPresent: [
        '@tanstack/react-query',
        'radix-ui',
        'sonner',
        'next-themes',
        'cmdk',
      ],
      depsAbsent: ['@supabase/supabase-js'],
      providersContains: ['QueryClientProvider'],
      providersAbsent: [],
      uiFilesPresent: [
        // Replaceable seven — refilled from snapshot. (sheet.tsx is in
        // `filesAbsent` because the default layout strips it before
        // the snapshot pass even sees it; see comment above.)
        'src/shared/ui/button.tsx',
        'src/shared/ui/dialog.tsx',
        'src/shared/ui/tabs.tsx',
        'src/shared/ui/command.tsx',
        'src/shared/ui/card.tsx',
        'src/shared/ui/toaster.tsx',
        // Non-replaceable — owned by the template across all `ui` choices.
        'src/shared/ui/theme-toggle.tsx',
        'src/shared/ui/language-switcher.tsx',
      ],
    },
  },
  {
    // --ui animate-ui lays down animate-ui's native components plus
    // shadcn fallbacks for primitives animate-ui doesn't ship
    // (card/command/toaster). Native components live under
    // `src/components/animate-ui/...` with thin re-export shims at
    // `src/shared/ui/<name>.tsx`.
    id: 'variants-animate-ui',
    projectName: 'eikon-e2e-variants-animate-ui',
    flags: ['--no-supabase', '--ui', 'animate-ui'],
    expect: {
      filesPresent: [
        'src/features/counter/index.ts',
        'components.json',
        // Native animate-ui directory — only present when ui=animate-ui.
        'src/components/animate-ui/components/buttons/button.tsx',
        'src/components/animate-ui/components/radix/dialog.tsx',
      ],
      filesAbsent: [
        'src/shared/supabase',
        'pnpm-workspace.yaml',
        // Layout-gated, see comment in variants-shadcn above.
        'src/shared/ui/sheet.tsx',
      ],
      depsPresent: [
        '@tanstack/react-query',
        'motion',
        'radix-ui',
        'sonner',
        'next-themes',
      ],
      depsAbsent: ['@supabase/supabase-js'],
      providersContains: ['QueryClientProvider'],
      providersAbsent: [],
      uiFilesPresent: [
        // Re-export shims at src/shared/ui — these point at the
        // native animate-ui components.
        'src/shared/ui/button.tsx',
        'src/shared/ui/dialog.tsx',
        'src/shared/ui/tabs.tsx',
        // Shadcn-fallback primitives (animate-ui doesn't ship these).
        'src/shared/ui/command.tsx',
        'src/shared/ui/card.tsx',
        'src/shared/ui/toaster.tsx',
        // Non-replaceable.
        'src/shared/ui/theme-toggle.tsx',
        'src/shared/ui/language-switcher.tsx',
      ],
    },
  },
  {
    // `--pm npm` rewrite: assert that the scaffolded package.json no longer
    // depends on pnpm anywhere — engines pin npm, packageManager declares
    // npm, and the aggregate scripts shell out via `npm run`. Workspace-
    // filter scripts are pnpm-only but they're already pruned on web
    // (this is a web scaffold), so there's nothing left to corrupt.
    id: 'pm-npm',
    projectName: 'eikon-e2e-pm-npm',
    pm: 'npm',
    flags: ['--no-supabase'],
    expect: {
      filesPresent: ['src/features/counter/index.ts'],
      filesAbsent: ['pnpm-workspace.yaml'],
      depsPresent: ['react', '@tanstack/react-query'],
      depsAbsent: ['@supabase/supabase-js'],
      providersContains: ['QueryClientProvider'],
      providersAbsent: [],
      enginesEquals: { node: '>=20.10.0', npm: '>=10.0.0' },
      packageManagerEquals: 'npm@10.9.0',
      // Aggregate scripts must use `npm run`, not `pnpm run`. Non-aggregate
      // scripts (`dev`, `build`, `typecheck`) stay byte-identical because
      // the rewriter only touches `\bpnpm run\b`.
      scriptsContaining: {
        check: 'npm run typecheck',
        ci: 'npm run build',
      },
      scriptsNotContaining: {
        check: 'pnpm run',
        ci: 'pnpm run',
      },
    },
  },
  {
    // `--pm bun` rewrite: same shape as pm-npm but with bun's spec.
    id: 'pm-bun',
    projectName: 'eikon-e2e-pm-bun',
    pm: 'bun',
    flags: ['--no-supabase'],
    expect: {
      filesPresent: ['src/features/counter/index.ts'],
      filesAbsent: ['pnpm-workspace.yaml'],
      depsPresent: ['react', '@tanstack/react-query'],
      depsAbsent: ['@supabase/supabase-js'],
      providersContains: ['QueryClientProvider'],
      providersAbsent: [],
      enginesEquals: { node: '>=20.10.0', bun: '>=1.1.0' },
      packageManagerEquals: 'bun@1.1.30',
      scriptsContaining: {
        check: 'bun run typecheck',
        ci: 'bun run build',
      },
      scriptsNotContaining: {
        check: 'pnpm run',
        ci: 'pnpm run',
      },
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

    step('install tarball into shared sandbox (once)');
    const cliBin = await installSharedSandbox(tmp, tarballPath);
    console.log(`        -> bin: ${path.relative(tmp, cliBin)}`);

    for (const scenario of selected) {
      console.log(
        `\n[e2e] === scenario: ${scenario.id} ` +
          `(flags: ${scenario.flags.join(' ')}) ===`
      );
      await runScenario(scenario, tmp, cliBin);
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

/**
 * Install the packed CLI tarball into a single shared sandbox once and
 * return the absolute path to its `node_modules/.bin/create-eikon-react`.
 *
 * The earlier shape did this `npm install --no-save tarball` step inside
 * every scenario, which on a 9-scenario run cost ~9× the install
 * overhead even though the tarball is identical across all of them.
 * The shared install drops that to one fixed cost; each scenario only
 * pays for its own scaffold + verify (+ optional pnpm install).
 *
 * The bin file is the same across scenarios — it's a thin shim that
 * resolves the CLI's dist/index.js. Scenarios run in their own scratch
 * dirs and never write into the sandbox, so reuse is safe.
 */
async function installSharedSandbox(tmpRoot, tarballPath) {
  const sandbox = path.join(tmpRoot, 'sandbox');
  await mkdir(sandbox, { recursive: true });
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
  return cliBin;
}

async function runScenario(scenario, tmpRoot, cliBin) {
  const scratch = path.join(tmpRoot, `scratch-${scenario.id}`);
  await mkdir(scratch, { recursive: true });

  step('  invoke CLI');
  // Default to pnpm so the existing scenarios stay green; pm-* scenarios
  // override via `scenario.pm` to exercise the npm / bun rewrite paths.
  const pm = scenario.pm ?? 'pnpm';
  await run(
    cliBin,
    [
      scenario.projectName,
      '--yes',
      ...scenario.flags,
      '--pm',
      pm,
      '--no-install',
      '--no-git',
    ],
    scratch
  );

  const projectDir = path.join(scratch, scenario.projectName);
  if (!existsSync(projectDir)) {
    throw new Error(`CLI did not create ${projectDir}`);
  }

  step('  verify generated tree & deps');
  await verifyScenario(projectDir, scenario.expect);

  if (args.quick) {
    console.log('  (skipping install/test/build because --quick)');
    return;
  }

  if (scenario.scaffoldOnly) {
    // Scenarios marked `scaffoldOnly` produce a tree that isn't
    // installable end-to-end (typically because a downstream
    // dependency — e.g. a populated UI snapshot — isn't available in
    // this checkout). The scaffold + verify step has already run and
    // is the only assertion that's stable here.
    console.log(
      '  (skipping install/test/build because scenario is scaffoldOnly)'
    );
    return;
  }

  // pnpm 9+ refuses to install when `package.json` declares a different
  // `packageManager` field (the `manage-package-manager-versions` rule).
  // Mirror the user's choice end-to-end so the generated project is
  // exercised with its declared pm.
  if (pm !== 'pnpm' && !(await commandExists(pm))) {
    // Locally, missing bun is a soft skip — the scaffold + verify step
    // already validated the rewrite. In CI we MUST fail loud, otherwise
    // a regression in the bun rewrite path would silently land because
    // none of the downstream assertions ran. The `CI=1` env that
    // `run()` injects into child processes is set by GitHub Actions
    // and (locally) by this very script's `run()` helper — so we look
    // at process.env directly here, which carries the user's outer
    // shell value.
    if (process.env.CI === 'true' || process.env.CI === '1') {
      throw new Error(
        `[e2e] scenario "${scenario.id}" requires '${pm}' on PATH but it ` +
          `is not installed. CI must run with all package managers ` +
          `available — install '${pm}' on the runner or remove the scenario.`
      );
    }
    console.log(
      `  (skipping install/build because '${pm}' is not on PATH; ` +
        'scaffold + verify already passed)'
    );
    return;
  }

  step(`  ${pm} install (in generated project)`);
  // Honour the generated project's `pnpm-workspace.yaml` — desktop / mobile
  // scaffolds depend on `apps/*` being recognised as workspace packages so
  // that `tauri:dev` / `cap:sync` resolve via `pnpm --filter "./apps/<x>"`.
  // See `PM_INSTALL_ARGS` for the per-pm flag rationale.
  await run(pm, PM_INSTALL_ARGS[pm], projectDir);

  step(`  ${pm} typecheck`);
  await run(pm, ['run', 'typecheck'], projectDir);

  step(`  ${pm} test`);
  await run(pm, ['run', 'test'], projectDir);

  step(`  ${pm} lint`);
  await run(pm, ['run', 'lint'], projectDir);

  step(`  ${pm} build`);
  await run(pm, ['run', 'build'], projectDir);
}

// Per-pm install args. `--prefer-offline` is only safe for pnpm here:
// pnpm's metadata cache is auto-refreshed by every workspace install in
// this monorepo, so it's never stale. npm's cache lifetime is governed
// by `cache-min` and routinely lags behind the registry — using
// `--prefer-offline` there causes intermittent "no matching version"
// errors against legitimately-published deps. bun has no equivalent
// flag (it owns its global cache).
const PM_INSTALL_ARGS = {
  pnpm: ['install', '--prefer-offline'],
  npm: ['install'],
  bun: ['install'],
};

/**
 * Probe whether a CLI is on PATH by running `<cmd> --version`. Used to
 * gracefully skip the install/build phase for `pm-bun` on machines where
 * bun isn't installed — the scaffold + tree verification still runs and
 * is the part of the test that's actually pm-specific. pnpm and npm are
 * both prerequisites of this monorepo so we don't bother probing them.
 */
function commandExists(cmd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, ['--version'], {
      stdio: 'ignore',
      shell: process.platform === 'win32',
    });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
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
  // Same shape as filesAbsent — tucked behind a separate key only so
  // the existing scenario data stays unchanged. Use it for ad-hoc
  // absence checks that don't fit the platform/strip rules already
  // covered by `filesAbsent`.
  for (const rel of expect.filesAbsentExtra ?? []) {
    if (existsSync(path.join(projectDir, rel))) {
      throw new Error(`expected file absent (extra): ${rel}`);
    }
  }
  // UI primitives are tested separately so the assertions read
  // ergonomically alongside the `--ui` flag changes — the file paths
  // are all `src/shared/ui/<basename>.tsx` and the failure messages
  // pinpoint the snapshot delete/lay-down behaviour.
  for (const rel of expect.uiFilesPresent ?? []) {
    if (!existsSync(path.join(projectDir, rel))) {
      throw new Error(`expected UI file present: ${rel}`);
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

  // PM-rewrite assertions. The CLI's rewrite-package-manager.js is what
  // wires `--pm npm|bun` through to `engines` / `packageManager` /
  // `scripts`; without these checks we'd silently regress to a project
  // that demands pnpm even when the user picked something else.
  if (expect.enginesEquals) {
    const actual = pkg.engines ?? {};
    const expected = expect.enginesEquals;
    const keysMatch =
      Object.keys(actual).length === Object.keys(expected).length &&
      Object.keys(expected).every((k) => actual[k] === expected[k]);
    if (!keysMatch) {
      throw new Error(
        `expected package.json engines to equal ${JSON.stringify(
          expected
        )} but got ${JSON.stringify(actual)}`
      );
    }
  }

  if (expect.packageManagerEquals !== undefined) {
    if (pkg.packageManager !== expect.packageManagerEquals) {
      throw new Error(
        `expected package.json packageManager=${JSON.stringify(
          expect.packageManagerEquals
        )} but got ${JSON.stringify(pkg.packageManager)}`
      );
    }
  }

  if (expect.scriptsContaining) {
    const scripts = pkg.scripts ?? {};
    for (const [name, needle] of Object.entries(expect.scriptsContaining)) {
      const cmd = scripts[name];
      if (typeof cmd !== 'string') {
        throw new Error(
          `expected package.json script ${name} to exist for scriptsContaining check`
        );
      }
      if (!cmd.includes(needle)) {
        throw new Error(
          `expected package.json scripts.${name} to contain ${JSON.stringify(
            needle
          )} but got ${JSON.stringify(cmd)}`
        );
      }
    }
  }

  if (expect.scriptsNotContaining) {
    const scripts = pkg.scripts ?? {};
    for (const [name, needle] of Object.entries(expect.scriptsNotContaining)) {
      const cmd = scripts[name];
      if (typeof cmd !== 'string') continue;
      if (cmd.includes(needle)) {
        throw new Error(
          `expected package.json scripts.${name} to NOT contain ${JSON.stringify(
            needle
          )} but got ${JSON.stringify(cmd)}`
        );
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
