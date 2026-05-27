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
 */

import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const SNAPSHOTS_ROOT = path.join(PACKAGE_ROOT, 'template-snapshots');

const COMPONENTS = [
  'button',
  'dialog',
  'tabs',
  'sheet',
  'command',
  'card',
  'sonner', // shadcn's name for the toaster primitive; renamed to toaster.tsx on harvest
];

// Map upstream basename → our canonical basename. shadcn ships sonner.tsx,
// animate-ui ships sonner.tsx — we normalise to toaster.tsx because the
// rest of the template imports `@/shared/ui/toaster`.
const FILENAME_REWRITE = {
  'sonner.tsx': 'toaster.tsx',
};

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
// see ANIMATE_UI_NATIVE_TARGETS below.
const ANIMATE_UI_REGISTRY_MAP = {
  button: 'https://animate-ui.com/r/components-buttons-button.json',
  dialog: 'https://animate-ui.com/r/components-radix-dialog.json',
  tabs: 'https://animate-ui.com/r/components-radix-tabs.json',
  sheet: 'https://animate-ui.com/r/components-radix-sheet.json',
  // Not shipped by animate-ui — fall back to the upstream shadcn slug.
  command: 'command',
  card: 'card',
  sonner: 'sonner',
};

// Minimal components.json each temp project needs so the registry CLI
// knows where to write files. We use the same alias shape as the real
// scaffolded project so the harvested files don't need rewriting.
const COMPONENTS_JSON = {
  $schema: 'https://ui.shadcn.com/schema.json',
  style: 'new-york',
  rsc: false,
  tsx: true,
  tailwind: {
    config: '',
    css: 'src/styles/index.css',
    baseColor: 'neutral',
    cssVariables: true,
    prefix: '',
  },
  aliases: {
    components: '@/shared/ui',
    utils: '@/shared/lib/cn',
    ui: '@/shared/ui',
    lib: '@/shared/lib',
    hooks: '@/shared/hooks',
  },
};

// Animate-UI native components live under src/components/animate-ui/...
// rather than src/shared/ui/. To keep the template's `@/shared/ui/<name>`
// imports working, we generate a thin re-export shim per native component
// at src/shared/ui/<name>.tsx that just `export * from` the nested file.
// This is option A from the design discussion — keeps animate-ui's
// internal layering intact (it imports primitives via
// `@/components/animate-ui/primitives/...` and we don't fight that),
// while still letting the rest of the template say `import { Button }
// from '@/shared/ui/button'`. Components animate-ui doesn't ship
// (card/command/toaster) come from the shadcn fallback and land at
// src/shared/ui/ directly — no shim needed there.
const ANIMATE_UI_NATIVE_TARGETS = {
  'button.tsx': 'components/animate-ui/components/buttons/button',
  'dialog.tsx': 'components/animate-ui/components/radix/dialog',
  'tabs.tsx': 'components/animate-ui/components/radix/tabs',
  'sheet.tsx': 'components/animate-ui/components/radix/sheet',
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
  // when a patch we expected to apply silently no-op'd — the most
  // dangerous failure mode here is "upstream layout changed → regex
  // didn't match → patcher returned without touching the file → snapshot
  // ships missing the project's contract". `changed: false` can ALSO
  // mean "patch already applied" (idempotent re-run), but on a fresh
  // npx-shadcn-add harvest that's also a sign something is wrong, so
  // either case fails loud.
  assertPatched(ui, 'ensureToasterExportsToast', await ensureToasterExportsToast(dest));
  assertPatched(ui, 'ensureCardHoverableClass', await ensureCardHoverableClass(dest));
  assertPatched(ui, 'ensureCardTitleIsHeading', await ensureCardTitleIsHeading(dest));

  return { dest, fileCount };
}

function assertPatched(ui, name, result) {
  if (!result || typeof result.changed !== 'boolean') {
    throw new Error(`[${ui}] ${name}: expected { changed: boolean } result`);
  }
  if (!result.changed) {
    throw new Error(
      `[${ui}] ${name}: did not change the snapshot (reason: ${result.reason ?? 'unknown'}). ` +
        `Either the upstream registry layout changed and the regex needs updating, ` +
        `or the file the patcher targets is missing from the harvest.`
    );
  }
}

async function ensureToasterExportsToast(dest) {
  const toasterPath = path.join(dest, 'src', 'shared', 'ui', 'toaster.tsx');
  if (!(await pathExists(toasterPath))) {
    return { changed: false, reason: 'toaster.tsx missing from snapshot' };
  }
  const body = await readFile(toasterPath, 'utf8');
  if (/\bexport\s*\{\s*toast\s*\}/.test(body)) {
    // Upstream already exports `toast` — no patch needed. Treat as a
    // legitimate change so the driver doesn't false-alarm.
    return { changed: true, reason: 'upstream already exports toast' };
  }
  const trailingNewline = body.endsWith('\n') ? '' : '\n';
  const appended =
    body +
    trailingNewline +
    `// Re-export the imperative \`toast()\` helper from sonner so the\n` +
    `// template's \`@/shared/ui/toaster\` contract matches across all\n` +
    `// \`--ui\` choices. Inserted by sync-ui-snapshots.mjs.\n` +
    `export { toast } from 'sonner';\n`;
  await writeFile(toasterPath, appended, 'utf8');
  return { changed: true };
}

async function ensureCardHoverableClass(dest) {
  const cardPath = path.join(dest, 'src', 'shared', 'ui', 'card.tsx');
  if (!(await pathExists(cardPath))) {
    return { changed: false, reason: 'card.tsx missing from snapshot' };
  }
  const body = await readFile(cardPath, 'utf8');
  if (/\bcardHoverableClass\b/.test(body)) {
    return { changed: true, reason: 'upstream already exports cardHoverableClass' };
  }
  const trailingNewline = body.endsWith('\n') ? '' : '\n';
  const appended =
    body +
    trailingNewline +
    `// Opt-in hover-lift class consumed by the template's HomePage,\n` +
    `// TaskCard and CardShowcase. Defined here so the template's\n` +
    `// \`@/shared/ui/card\` contract is identical across all \`--ui\`\n` +
    `// choices. Inserted by sync-ui-snapshots.mjs.\n` +
    `export const cardHoverableClass =\n` +
    `  'transition-shadow duration-200 hover:[box-shadow:var(--surface-hover-shadow)] active:[box-shadow:var(--surface-active-shadow)]';\n`;
  await writeFile(cardPath, appended, 'utf8');
  return { changed: true };
}

async function ensureCardTitleIsHeading(dest) {
  const cardPath = path.join(dest, 'src', 'shared', 'ui', 'card.tsx');
  if (!(await pathExists(cardPath))) {
    return { changed: false, reason: 'card.tsx missing from snapshot' };
  }
  const body = await readFile(cardPath, 'utf8');
  // Already an h-element? Upstream did the right thing on its own.
  if (/function\s+CardTitle[\s\S]*?<h[1-6]\b/.test(body)) {
    return { changed: true, reason: 'upstream already renders CardTitle as <h*>' };
  }
  // Use [\s\S]*? for cross-line content — `[^)]*?` stops short on the
  // `)` inside the type annotation. We match the function signature's
  // `<"div">` annotation and the JSX `<div ... />` that follows, and
  // rewrite both to h3.
  const next = body.replace(
    /(function\s+CardTitle\s*\([\s\S]*?React\.ComponentProps<")div("\s*>[\s\S]*?return\s*\(\s*)<div([\s\S]*?\/>)/,
    '$1h3$2<h3$3'
  );
  if (next === body) {
    // Pattern didn't match. The most likely cause is an upstream layout
    // change (shadcn switched away from `React.ComponentProps<"div">`
    // or stopped using a single `return (<div ... />)` body). Bail loud
    // — silently shipping a snapshot whose CardTitle is still a `<div>`
    // would break the template's structural a11y test in a way that's
    // hard to trace back to this script.
    return {
      changed: false,
      reason:
        'CardTitle regex did not match — upstream shadcn layout likely changed; ' +
        'inspect template-snapshots/<ui>/src/shared/ui/card.tsx and update the regex.',
    };
  }
  await writeFile(cardPath, next, 'utf8');
  return { changed: true };
}

async function generateAnimateUiShims(dest) {
  const shimDir = path.join(dest, 'src', 'shared', 'ui');
  await mkdir(shimDir, { recursive: true });
  let count = 0;
  for (const [filename, targetRel] of Object.entries(ANIMATE_UI_NATIVE_TARGETS)) {
    const targetAbs = path.join(dest, 'src', `${targetRel}.tsx`);
    // Only write the shim when animate-ui actually shipped the
    // component. If the registry CLI fell back to plain shadcn (no
    // native animate-ui version available), shadcn's file at
    // src/shared/ui/<filename> is the answer — leave it alone.
    if (!(await pathExists(targetAbs))) continue;
    const shimPath = path.join(shimDir, filename);
    const importPath = `@/${targetRel}`;
    const body =
      `// Generated by sync-ui-snapshots.mjs — re-export shim around\n` +
      `// animate-ui's native component at ${importPath}. Edit the\n` +
      `// underlying file (or pick \`--ui custom\`/\`--ui shadcn\`) to\n` +
      `// change behaviour; this file is overwritten on next sync.\n` +
      `export * from '${importPath}';\n`;
    await writeFile(shimPath, body, 'utf8');
    count += 1;
  }
  return { count };
}

async function copyTreeWithRewrites(src, dest) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  let count = 0;
  for (const e of entries) {
    const s = path.join(src, e.name);
    // Skip the placeholder index.css we wrote into the temp project so
    // the registry CLI didn't fail on its absence — it's not part of
    // the snapshot.
    if (e.name === 'index.css' && path.basename(path.dirname(s)) === 'styles') continue;
    if (e.isDirectory()) {
      const sub = await copyTreeWithRewrites(s, path.join(dest, e.name));
      count += sub;
    } else if (e.isFile()) {
      const renamed = FILENAME_REWRITE[e.name] ?? e.name;
      const d = path.join(dest, renamed);
      let body = await readFile(s, 'utf8');
      // If we renamed sonner → toaster, rewrite project-internal import
      // paths to the renamed file (e.g. `@/shared/ui/sonner` →
      // `@/shared/ui/toaster`, `'./sonner'` → `'./toaster'`). DO NOT
      // touch bare `'sonner'` imports — that's the npm package name and
      // must stay intact.
      if (e.name !== renamed) {
        body = body
          .replace(/(@\/shared\/ui\/)sonner\b/g, '$1toaster')
          .replace(/(['"])\.\/sonner(['"])/g, '$1./toaster$2');
      }
      body = normaliseSnapshotSource(body);
      await writeFile(d, body, 'utf8');
      count += 1;
    }
  }
  return count;
}

async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

// Post-process upstream registry source so it survives the template's
// strict tsconfig flags. Two narrow rewrites, both safe to re-apply:
//
// 1. Drop `import * as React from "react"` when nothing in the file
//    references `React.` — registry files include the side-import for
//    legacy compatibility, but with `jsx: "react-jsx"` it isn't needed,
//    and `noUnusedLocals` (TS6133) blows up on it.
//
// 2. Mark known type-only re-exports as `type`-imports — needed under
//    `verbatimModuleSyntax: true` (TS1484). The list is hard-coded
//    rather than inferred because regex-level type-vs-value detection
//    is unreliable; if upstream adds a new type-only name, the e2e
//    typecheck will flag it and we extend this list.
const TYPE_ONLY_IMPORT_NAMES = ['WithAsChild'];

function normaliseSnapshotSource(body) {
  let next = body;

  // (1) Drop unused `import * as React from "react"`
  const reactImport = /^import \* as React from ['"]react['"];?\s*\n/m;
  if (reactImport.test(next)) {
    const withoutImport = next.replace(reactImport, '');
    if (!/\bReact\./.test(withoutImport)) {
      next = withoutImport;
    }
  }

  // (1b) If `React.` is referenced but no React import remains, prepend
  //      a type-only import. shadcn's toaster uses `React.CSSProperties`
  //      without importing React (it leans on the legacy global, which
  //      isn't there under `jsx: react-jsx`).
  if (/\bReact\./.test(next) && !/from ['"]react['"]/.test(next)) {
    next = `import type * as React from 'react';\n` + next;
  }

  // (2) Convert known type-only names inside non-type imports to
  //     `type X` named imports. Matches `{ A, X, B }` → `{ A, type X, B }`
  //     when the import statement isn't already `import type {...}`.
  for (const name of TYPE_ONLY_IMPORT_NAMES) {
    const re = new RegExp(
      `(import\\s+(?!type\\s)\\{[^}]*?)\\b(?<!type )${name}\\b([^}]*\\}\\s*from\\s+['"][^'"]+['"];?)`,
      'g'
    );
    next = next.replace(re, (_match, before, after) => `${before}type ${name}${after}`);
  }

  return next;
}

function sortObj(obj) {
  const out = {};
  for (const k of Object.keys(obj).sort()) out[k] = obj[k];
  return out;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
