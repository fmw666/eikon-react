#!/usr/bin/env node
/**
 * @file sync-ui-snapshots.mjs
 * @description Maintainer-run script: pull fresh `--ui shadcn` and
 *   `--ui animate-ui` component sets from their upstream registries
 *   into `packages/create-eikon-react/template-snapshots/<ui>/`.
 *
 * This script is INTENTIONALLY MANUAL — it is not invoked from `build`,
 * `prepublishOnly`, or CI. The whole point of pre-baked snapshots is
 * that upstream churn gets reviewed before it ships to scaffold users;
 * automating the sync would defeat that.
 *
 * Workflow:
 *   1. Maintainer runs `pnpm sync-ui-snapshots` from this package.
 *   2. Script spins up a temp dir, drops a minimal `package.json` +
 *      `tsconfig.json` + `components.json` per registry, then drives
 *      the upstream CLI (`shadcn add ...` / `animate-ui add ...`) to
 *      lay down the seven canonical primitives.
 *   3. Script harvests the resulting files, normalises import aliases
 *      to `@/shared/ui/...` (the alias the rest of the template uses),
 *      reads back the dependencies the registry pinned, and writes
 *      everything under `template-snapshots/<ui>/`.
 *   4. Maintainer reviews `git diff template-snapshots/`, commits if
 *      the upstream changes look intentional.
 *
 * Network + tooling required:
 *   - Internet access (registry endpoints)
 *   - npx (bundled with Node)
 *   - The shadcn / animate-ui CLIs are invoked via `npx`, no global
 *     install needed.
 *
 * The seven primitives are the same set listed in
 * `apply-ui-snapshot.ts:REPLACEABLE_UI_FILES` — keep these two lists
 * in sync.
 *
 * Cohesive internals live in co-located sibling modules (data tables in
 * `*.constants.mjs`, fs/normalisation in `*.fs.mjs`, post-harvest
 * patchers in `*.patchers.mjs`). This file keeps the orchestration.
 */

import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { COMPONENTS_JSON } from './sync-ui-snapshots.constants.mjs';
import { copyTreeWithRewrites, pathExists, sortObj } from './sync-ui-snapshots.fs.mjs';
import {
  assertPatched,
  ensureCardHoverableClass,
  ensureCardTitleIsHeading,
  ensureToasterExportsToast,
  generateAnimateUiShims,
} from './sync-ui-snapshots.patchers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const SNAPSHOTS_ROOT = path.join(PACKAGE_ROOT, 'template-snapshots');

// COMPONENTS and ANIMATE_UI_REGISTRY_MAP stay inline here (not in the
// sibling constants module) because the parity test in
// `ui-snapshot-parity.test.ts` reads them by source-text search from
// THIS file — they are the registry contract this script owns.
const COMPONENTS = [
  'button',
  'dialog',
  'tabs',
  'sheet',
  'command',
  'card',
  'sonner', // shadcn's name for the toaster primitive; renamed to toaster.tsx on harvest
  // Form + display primitives shipped by the design-system audit pass.
  // Keep this list in lock-step with `apply-ui-snapshot.ts:REPLACEABLE_UI_FILES`.
  'input',
  'textarea',
  'label',
  'select',
  'checkbox',
  'radio-group',
  'switch',
  'badge',
  'avatar',
  'skeleton',
  'tooltip',
  'popover',
  'alert',
];

// Animate-UI's registry doesn't expose components by simple slugs —
// items are named like `components-buttons-button`,
// `components-radix-dialog`, etc. (verified via
// https://animate-ui.com/r/registry.json). Card / command / toaster
// aren't in animate-ui at all, so we fall through to the plain shadcn
// registry for those — animate-ui is shadcn-compatible, so the two
// can coexist in the same project. This map encodes that.
//
// animate-ui's native components write to nested paths like
// `src/components/animate-ui/components/buttons/button.tsx`, not
// `src/shared/ui/button.tsx`. We bridge that with re-export shims —
// see ANIMATE_UI_NATIVE_TARGETS in sync-ui-snapshots.constants.mjs.
const ANIMATE_UI_REGISTRY_MAP = {
  button: 'https://animate-ui.com/r/components-buttons-button.json',
  dialog: 'https://animate-ui.com/r/components-radix-dialog.json',
  tabs: 'https://animate-ui.com/r/components-radix-tabs.json',
  sheet: 'https://animate-ui.com/r/components-radix-sheet.json',
  // Not shipped by animate-ui — fall back to the upstream shadcn slug.
  command: 'command',
  card: 'card',
  sonner: 'sonner',
  // Form + display primitives — most aren't in animate-ui's registry,
  // so they fall through to shadcn. If/when animate-ui ships native
  // animated versions of any of these (most likely tooltip/popover/
  // switch as radix-* slugs), update the URL inline.
  input: 'input',
  textarea: 'textarea',
  label: 'label',
  select: 'select',
  checkbox: 'checkbox',
  'radio-group': 'radio-group',
  switch: 'switch',
  badge: 'badge',
  avatar: 'avatar',
  skeleton: 'skeleton',
  tooltip: 'tooltip',
  popover: 'popover',
  alert: 'alert',
};

// Pin the shadcn CLI to a specific minor so a maintainer running this
// script today gets the same registry CLI behaviour they got the last
// time the snapshots were regenerated. The CLI itself is responsible
// for fetching components — the shadcn / animate-ui REGISTRY content
// is server-side and not version-pinnable from here, so this pin only
// freezes the CLI's behaviour (component-resolution rules, output
// paths, components.json schema). Bump intentionally when adopting a
// newer shadcn release that changes those rules.
const SHADCN_CLI_PIN = 'shadcn@2.5.0';

const REGISTRIES = {
  shadcn: {
    addCmd: (component) => [SHADCN_CLI_PIN, 'add', component, '--yes', '--overwrite'],
  },
  'animate-ui': {
    // animate-ui ships shadcn-compatible registry items, but its
    // slugs aren't `<name>.json` — see ANIMATE_UI_REGISTRY_MAP above.
    // Slugs that aren't a URL fall through to the plain shadcn
    // registry (animate-ui is shadcn-compatible, so they coexist).
    addCmd: (component) => {
      const target = ANIMATE_UI_REGISTRY_MAP[component] ?? component;
      return [SHADCN_CLI_PIN, 'add', target, '--yes', '--overwrite'];
    },
  },
};

async function run() {
  for (const ui of Object.keys(REGISTRIES)) {
    console.log(`\n[sync-ui-snapshots] === ${ui} ===`);
    await syncOne(ui);
  }
  console.log('\n[sync-ui-snapshots] done. Review with: git diff template-snapshots/');
}

async function syncOne(ui) {
  const tmp = await mkdtemp(path.join(tmpdir(), `eikon-ui-sync-${ui}-`));
  console.log(`[${ui}] temp project: ${tmp}`);

  try {
    await scaffoldTempProject(tmp);
    const failures = [];
    for (const component of COMPONENTS) {
      const ok = await addComponent(tmp, ui, component);
      if (!ok) failures.push(component);
    }
    if (failures.length > 0) {
      console.warn(
        `[${ui}] WARN: failed to add ${failures.length} component(s): ${failures.join(', ')}`
      );
    }

    const harvested = await harvestSnapshot(tmp, ui);
    console.log(`[${ui}] harvested ${harvested.fileCount} file(s) → ${harvested.dest}`);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

async function scaffoldTempProject(tmp) {
  // Bare-minimum project shadcn's CLI will accept: package.json with
  // typescript + react listed (so `tsx: true` resolves), tsconfig with
  // the `@/*` path alias, and an empty src/styles/index.css the CLI
  // can read without complaining.
  await writeFile(
    path.join(tmp, 'package.json'),
    JSON.stringify(
      {
        name: 'eikon-ui-sync-tmp',
        version: '0.0.0',
        private: true,
        type: 'module',
        dependencies: {
          react: '^19.0.0',
          'react-dom': '^19.0.0',
        },
        devDependencies: {
          typescript: '^5.6.3',
        },
      },
      null,
      2
    ),
    'utf8'
  );

  await writeFile(
    path.join(tmp, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          jsx: 'react-jsx',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          baseUrl: '.',
          paths: {
            '@/*': ['./src/*'],
          },
        },
        include: ['src'],
      },
      null,
      2
    ),
    'utf8'
  );

  await mkdir(path.join(tmp, 'src', 'styles'), { recursive: true });
  await writeFile(path.join(tmp, 'src', 'styles', 'index.css'), '@tailwind base;\n', 'utf8');

  await writeFile(
    path.join(tmp, 'components.json'),
    JSON.stringify(COMPONENTS_JSON, null, 2),
    'utf8'
  );
}

async function addComponent(tmp, ui, component) {
  const args = REGISTRIES[ui].addCmd(component);
  console.log(`[${ui}] npx ${args.join(' ')}`);
  const code = await spawnInherit('npx', args, tmp);
  if (code !== 0) {
    console.warn(`[${ui}] component "${component}" failed (exit ${code})`);
    return false;
  }
  return true;
}

function spawnInherit(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('close', (code) => resolve(code ?? 0));
    child.on('error', reject);
  });
}

async function harvestSnapshot(tmp, ui) {
  const dest = path.join(SNAPSHOTS_ROOT, ui);
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });

  // Copy all files the CLI placed under src/shared/ui/ (and anywhere
  // else under src/ — animate-ui sometimes adds hooks alongside).
  const srcDir = path.join(tmp, 'src');
  let fileCount = 0;
  if (await pathExists(srcDir)) {
    fileCount = await copyTreeWithRewrites(srcDir, path.join(dest, 'src'));
  }

  // Carry over the components.json the CLI may have rewritten.
  const tmpComponents = path.join(tmp, 'components.json');
  if (await pathExists(tmpComponents)) {
    await copyFile(tmpComponents, path.join(dest, 'components.json'));
  }

  // Harvest the deps the registry pinned by diffing against our
  // baseline. Anything in tmp/package.json's dependencies that wasn't
  // in our scaffold-time baseline is what the registry added.
  const tmpPkg = JSON.parse(await readFile(path.join(tmp, 'package.json'), 'utf8'));
  const baselineDeps = new Set(['react', 'react-dom']);
  const harvestedDeps = {};
  for (const [name, version] of Object.entries(tmpPkg.dependencies ?? {})) {
    if (!baselineDeps.has(name)) harvestedDeps[name] = version;
  }
  const harvestedDevDeps = {};
  for (const [name, version] of Object.entries(tmpPkg.devDependencies ?? {})) {
    if (name !== 'typescript') harvestedDevDeps[name] = version;
  }

  await writeFile(
    path.join(dest, 'package-deps.json'),
    JSON.stringify(
      {
        dependencies: sortObj(harvestedDeps),
        ...(Object.keys(harvestedDevDeps).length > 0
          ? { devDependencies: sortObj(harvestedDevDeps) }
          : {}),
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  // animate-ui's native components live under src/components/animate-ui/.
  // Lay down a re-export shim at src/shared/ui/<name>.tsx for each one
  // so the template's existing `@/shared/ui/<name>` imports keep
  // working without per-variant edits. This OVERWRITES any shadcn
  // fallback file that landed at the same path while shadcn was
  // resolving registry-dep chains (e.g. shadcn's `command` pulls in
  // shadcn's `dialog`, but if animate-ui shipped a native `dialog` we
  // want that one to win).
  if (ui === 'animate-ui') {
    const shims = await generateAnimateUiShims(dest);
    if (shims.count === 0) {
      throw new Error(
        `[${ui}] generateAnimateUiShims wrote 0 shims — animate-ui's ` +
          `native components didn't materialise under src/components/animate-ui/. ` +
          `Either the registry layout changed or none of the upstream items shipped.`
      );
    }
    console.log(`[${ui}] wrote ${shims.count} animate-ui shim(s)`);
  }

  // Each post-harvest patcher returns { changed: boolean } and we abort
  // when a patch we expected to apply silently no-op'd — see
  // sync-ui-snapshots.patchers.mjs for the rationale.
  assertPatched(ui, 'ensureToasterExportsToast', await ensureToasterExportsToast(dest));
  assertPatched(ui, 'ensureCardHoverableClass', await ensureCardHoverableClass(dest));
  assertPatched(ui, 'ensureCardTitleIsHeading', await ensureCardTitleIsHeading(dest));

  return { dest, fileCount };
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
