/**
 * @file apply-ui-snapshot.ts
 * @description Lays the chosen `--ui` library's pre-baked snapshot files
 * over the project's `src/shared/ui/`, splices the matching
 * `components.json` into the project root, and merges the snapshot's
 * dependency pins into `package.json`.
 *
 * The `ui` axis stopped being a runtime CSS-class swap in Phase J — the
 * three options now actually change which component implementations
 * ship:
 *
 *   --ui custom      project-authored Radix wrappers (the files already
 *                    in template/src/shared/ui/). NO-OP for this fn.
 *   --ui shadcn      official shadcn registry components, copied from
 *                    template-snapshots/shadcn/.
 *   --ui animate-ui  animate-ui registry components, copied from
 *                    template-snapshots/animate-ui/.
 *
 * Why pre-baked snapshots instead of fetching from the registry at
 * scaffold time:
 *   - Offline scaffolds keep working (pnpm dlx, air-gapped CI).
 *   - The user gets a reproducible result tied to the CLI version they
 *     installed, not whatever the registry happens to serve today.
 *   - Upstream churn is reviewed by maintainers via
 *     `scripts/sync-ui-snapshots.mjs`, not by random users at scaffold
 *     time.
 *
 * Snapshot directory layout (sibling to template/, not inside it — the
 * sync-template.mjs script wipes template/ before each rebuild, so
 * snapshots living inside template/ would be deleted on every CLI
 * publish prep):
 *
 *   template-snapshots/<ui>/
 *     src/shared/ui/<file>.tsx       (replaces project counterpart)
 *     components.json                (placed at project root)
 *     package-deps.json              (merged into project package.json)
 */

// =================================================================================================
// Imports
// =================================================================================================

import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// =================================================================================================
// Constants
// =================================================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Files in `src/shared/ui/` that the snapshot OWNS — these are deleted
 * before the snapshot is laid down so the project doesn't end up with a
 * mix of project-authored and registry-authored primitives. Files NOT
 * in this list (`theme-toggle.tsx`, `language-switcher.tsx`, anything
 * future) survive untouched across all `--ui` choices.
 *
 * Kept as basenames; `applyUiSnapshot` joins them against the project's
 * `src/shared/ui/` dir.
 */
const REPLACEABLE_UI_FILES: readonly string[] = [
  'button.tsx',
  'dialog.tsx',
  'tabs.tsx',
  'sheet.tsx',
  'command.tsx',
  'card.tsx',
  'toaster.tsx',
] as const;

const UI_DIR_REL = path.join('src', 'shared', 'ui');

// =================================================================================================
// Types
// =================================================================================================

export type UiVariant = 'custom' | 'shadcn' | 'animate-ui';

const UI_VARIANTS: ReadonlySet<UiVariant> = new Set([
  'custom',
  'shadcn',
  'animate-ui',
]);

function isUiVariant(v: string): v is UiVariant {
  return UI_VARIANTS.has(v as UiVariant);
}

interface PackageDepsFile {
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}

// =================================================================================================
// Helpers
// =================================================================================================

/**
 * Default snapshots root — sibling of `template/` inside the
 * create-eikon-react package. Resolves correctly both at
 * compile-output (dist/) and source-import (src/) time because
 * `__dirname/..` is always `packages/create-eikon-react/` in either
 * layout. Callers that bundle this module out-of-tree (e.g. the
 * preview-site if it ever stops importing the TS source directly)
 * should pass `snapshotsRoot` explicitly to override.
 */
function defaultSnapshotsRoot(): string {
  return path.resolve(__dirname, '..', 'template-snapshots');
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function copyDirRecursive(
  src: string,
  dest: string,
  filter?: (relPosix: string) => boolean,
  rel: string = ''
): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    const next = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      await copyDirRecursive(s, d, filter, next);
    } else if (e.isFile()) {
      if (filter && !filter(next)) continue;
      await copyFile(s, d);
    }
  }
}

/**
 * Decides whether a snapshot tree entry should be copied into the
 * scaffolded project. Replaceable primitives under `src/shared/ui/`
 * only copy when their counterpart survived `stripFeatures` (the
 * `survivors` set). Everything else copies through.
 */
function shouldCopySnapshotEntry(
  relPosix: string,
  survivors: ReadonlySet<string>
): boolean {
  const uiPrefix = 'shared/ui/';
  if (relPosix.startsWith(uiPrefix)) {
    const rest = relPosix.slice(uiPrefix.length);
    if (rest.includes('/')) return true;
    if (REPLACEABLE_UI_FILES.includes(rest)) {
      return survivors.has(rest);
    }
    return true;
  }
  return true;
}

// =================================================================================================
// Public API
// =================================================================================================

/**
 * True when `relPath` (POSIX-separated) names one of the seven UI
 * primitives the snapshot OWNS. The simulator uses this to decide
 * whether to read from `src/shared/ui/...` in the template-react tree
 * or from the snapshot dir for the chosen `ui`.
 */
export function isReplaceableUiFile(relPath: string): boolean {
  const expected = REPLACEABLE_UI_FILES.map((name) =>
    `${UI_DIR_REL.replace(/\\/g, '/')}/${name}`
  );
  return expected.includes(relPath);
}

/**
 * Returns the on-disk root for the chosen `ui`'s snapshot, or `null`
 * for `custom` (no snapshot — the template's own files are used) or
 * unknown values. Callers verify the directory exists separately.
 */
export function getSnapshotDir(
  ui: string,
  snapshotsRoot: string = defaultSnapshotsRoot()
): string | null {
  if (!isUiVariant(ui) || ui === 'custom') return null;
  return path.join(snapshotsRoot, ui);
}

/**
 * Walk a snapshot dir and return its files as POSIX-relative paths
 * (relative to the snapshot dir itself). Skips `package-deps.json`
 * because that's metadata for `applyUiSnapshot`, not a project file.
 *
 * Returns an empty array when the snapshot dir doesn't exist yet
 * (e.g. before the maintainer has run `pnpm sync-ui-snapshots`).
 */
export async function listSnapshotFiles(
  ui: string,
  snapshotsRoot: string = defaultSnapshotsRoot()
): Promise<string[]> {
  const dir = getSnapshotDir(ui, snapshotsRoot);
  if (!dir || !(await pathExists(dir))) return [];
  const out: string[] = [];
  await walkSnapshotDir(dir, '', out);
  return out.sort();
}

async function walkSnapshotDir(
  base: string,
  rel: string,
  acc: string[]
): Promise<void> {
  const entries = await readdir(path.join(base, rel), { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'package-deps.json' && rel === '') continue;
    if (e.name === '.gitkeep') continue;
    const next = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      await walkSnapshotDir(base, next, acc);
    } else if (e.isFile()) {
      acc.push(next);
    }
  }
}

/**
 * Read a single snapshot file's contents. `relPath` is relative to the
 * snapshot dir (not the project), POSIX-separated. Returns `null` when
 * the file or snapshot dir doesn't exist.
 */
export async function readSnapshotFile(
  ui: string,
  relPath: string,
  snapshotsRoot: string = defaultSnapshotsRoot()
): Promise<string | null> {
  const dir = getSnapshotDir(ui, snapshotsRoot);
  if (!dir) return null;
  const abs = path.join(dir, relPath);
  if (!(await pathExists(abs))) return null;
  try {
    return await readFile(abs, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Read the snapshot's `package-deps.json` if present. Returns `{}` when
 * absent — callers can spread this into `package.json`'s `dependencies`
 * unconditionally.
 */
export async function readSnapshotDeps(
  ui: string,
  snapshotsRoot: string = defaultSnapshotsRoot()
): Promise<{
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}> {
  const dir = getSnapshotDir(ui, snapshotsRoot);
  if (!dir) return { dependencies: {}, devDependencies: {} };
  const file = path.join(dir, 'package-deps.json');
  if (!(await pathExists(file))) {
    return { dependencies: {}, devDependencies: {} };
  }
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8')) as PackageDepsFile;
    return {
      dependencies: parsed.dependencies ?? {},
      devDependencies: parsed.devDependencies ?? {},
    };
  } catch {
    return { dependencies: {}, devDependencies: {} };
  }
}

/**
 * Replace the project's `src/shared/ui/*` library files with the chosen
 * snapshot, drop in `components.json`, and merge `package-deps.json`
 * into the project's `package.json`. No-op for `--ui custom`.
 *
 * Callers run this AFTER `stripFeatures` (so any feature-strip rules
 * have already pruned files) and BEFORE `rewritePackageManagerFields`
 * (so the deps merge happens on the same package.json the rewriter
 * mutates).
 */
export async function applyUiSnapshot(
  projectDir: string,
  ui: string,
  snapshotsRoot: string = defaultSnapshotsRoot()
): Promise<void> {
  if (!isUiVariant(ui)) {
    throw new Error(
      `[applyUiSnapshot] unknown ui variant: ${ui} ` +
        `(expected one of: ${Array.from(UI_VARIANTS).join(', ')})`
    );
  }
  if (ui === 'custom') return;

  const snapshotDir = path.join(snapshotsRoot, ui);
  if (!(await pathExists(snapshotDir))) {
    throw new Error(
      `[applyUiSnapshot] missing snapshot directory: ${snapshotDir} — ` +
        `run \`pnpm sync-ui-snapshots\` to regenerate.`
    );
  }

  // Empty-snapshot fallback. The snapshot dir exists but ships no UI
  // files (e.g. the maintainer hasn't run `sync-ui-snapshots` yet, or
  // an upstream registry update broke the sync mid-way). Treat as
  // no-op rather than wiping the project's owned UI files and leaving
  // dangling imports — the user gets a working `--ui custom` shape
  // with the chosen `--ui` value pinned in components.json (if the
  // snapshot ships one). Once the snapshot is populated, this branch
  // simply stops triggering.
  //
  // Loud, not silent — we tell the user the choice didn't materialise
  // so they don't think their `--ui animate-ui` flag did anything.
  const snapshotFiles = await listSnapshotFiles(ui, snapshotsRoot);
  const hasUiFiles = snapshotFiles.some((rel) => isReplaceableUiFile(rel));
  if (!hasUiFiles) {
    console.warn(
      `[create-eikon-react] WARN: \`--ui ${ui}\` snapshot at ` +
        `${snapshotDir} ships no UI primitives — falling back to ` +
        `the project-authored \`custom\` set. Run \`pnpm sync-ui-snapshots\` ` +
        `(maintainer task) to populate it.`
    );
    return;
  }

  // 1. Decide which replaceable primitives survived `stripFeatures`.
  //    Files like `sheet.tsx` carry `// @eikon:variant(layout=...) file`
  //    markers — when the user's layout doesn't need them, the strip
  //    pass deleted them already, and we MUST NOT resurrect them via
  //    the snapshot (the corresponding feature code that imports them
  //    has also been stripped, so a resurrected sheet.tsx would be
  //    dead code at best, an unused-import lint error at worst).
  const projectUiDir = path.join(projectDir, UI_DIR_REL);
  const survivors = new Set<string>();
  if (await pathExists(projectUiDir)) {
    for (const name of REPLACEABLE_UI_FILES) {
      if (await pathExists(path.join(projectUiDir, name))) {
        survivors.add(name);
      }
    }
    for (const name of survivors) {
      await rm(path.join(projectUiDir, name), { force: true });
    }
  } else {
    await mkdir(projectUiDir, { recursive: true });
  }

  // 2. Copy the snapshot's tree over. For replaceable primitives under
  //    `src/shared/ui/`, only copy files whose counterpart survived the
  //    strip pass (see step 1). Everything else (animate-ui's
  //    `src/components/`, `src/hooks/`, `src/lib/`) copies through
  //    unconditionally.
  const snapshotSrc = path.join(snapshotDir, 'src');
  if (await pathExists(snapshotSrc)) {
    await copyDirRecursive(
      snapshotSrc,
      path.join(projectDir, 'src'),
      (relPosix) => shouldCopySnapshotEntry(relPosix, survivors)
    );
  }

  // 3. Drop `components.json` at the project root if the snapshot
  //    provides one. shadcn / animate-ui both read it for further
  //    `add` operations the user runs post-scaffold.
  const componentsJson = path.join(snapshotDir, 'components.json');
  if (await pathExists(componentsJson)) {
    await copyFile(componentsJson, path.join(projectDir, 'components.json'));
  }

  // 4. Merge dependency pins into package.json. The snapshot ships
  //    only the deps the chosen library NEEDS — additive merge,
  //    snapshot wins on overlap (e.g. animate-ui pinning a specific
  //    `motion` version).
  await mergePackageDeps(projectDir, snapshotDir);

  // 5. Stamp `eslint.config.ui-snapshot.js`. The snapshot files don't
  //    follow the project's banner / import-order / max-lines
  //    conventions, and rewriting them on the way in would defeat
  //    the point of "use the upstream library verbatim". The main
  //    `eslint.config.js` lazy-imports this file when present and
  //    no-ops when it isn't — so `--ui custom` and the template-react
  //    package itself stay strict on their own project-authored
  //    primitives.
  await writeUiSnapshotEslintOverride(projectDir, ui);
}

async function mergePackageDeps(
  projectDir: string,
  snapshotDir: string
): Promise<void> {
  const depsFile = path.join(snapshotDir, 'package-deps.json');
  if (!(await pathExists(depsFile))) return;

  const raw = await readFile(depsFile, 'utf8');
  const parsed = JSON.parse(raw) as PackageDepsFile;
  const addDeps = parsed.dependencies ?? {};
  const addDevDeps = parsed.devDependencies ?? {};
  if (
    Object.keys(addDeps).length === 0 &&
    Object.keys(addDevDeps).length === 0
  ) {
    return;
  }

  const pkgPath = path.join(projectDir, 'package.json');
  const pkgRaw = await readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(pkgRaw) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  pkg.dependencies = sortDeps({ ...(pkg.dependencies ?? {}), ...addDeps });
  if (Object.keys(addDevDeps).length > 0) {
    pkg.devDependencies = sortDeps({
      ...(pkg.devDependencies ?? {}),
      ...addDevDeps,
    });
  }

  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
}

function sortDeps(deps: Record<string, string>): Record<string, string> {
  const sorted: Record<string, string> = {};
  for (const k of Object.keys(deps).sort()) {
    sorted[k] = deps[k]!;
  }
  return sorted;
}

/**
 * Files under `src/shared/ui/` whose lint rules the snapshot relaxes.
 * Mirrors `REPLACEABLE_UI_FILES` but expressed as ESLint glob entries.
 */
const SNAPSHOT_UI_FILE_GLOBS = REPLACEABLE_UI_FILES.map(
  (name) => `src/shared/ui/${name}`
);

const SNAPSHOT_RULES_OFF = {
  'eikon/file-header-banner': 'off',
  'eikon/filename-matches-export': 'off',
  'eikon/filename-case-by-path': 'off',
  'import/no-default-export': 'off',
  'import/order': 'off',
  'max-lines': 'off',
  '@typescript-eslint/consistent-type-imports': 'off',
  'react-refresh/only-export-components': 'off',
} as const;

function buildUiSnapshotEslintConfig(ui: UiVariant): string {
  if (ui === 'custom') return '';
  const extraGlobs =
    ui === 'animate-ui'
      ? [
          'src/components/animate-ui/**/*.{ts,tsx}',
          'src/hooks/**/*.{ts,tsx}',
          'src/lib/**/*.{ts,tsx}',
        ]
      : [];
  const files = [...SNAPSHOT_UI_FILE_GLOBS, ...extraGlobs];
  const filesLiteral = files.map((f) => `    '${f}'`).join(',\n');
  const rulesLiteral = Object.entries(SNAPSHOT_RULES_OFF)
    .map(([k, v]) => `    '${k}': '${v}'`)
    .join(',\n');
  return [
    '/**',
    ' * @file eslint.config.ui-snapshot.js',
    ` * @description Override block emitted by \`applyUiSnapshot\` for \`--ui ${ui}\`.`,
    ' *',
    ' * The vendored UI primitives under `src/shared/ui/` (and any extra',
    ' * helper paths the registry ships, e.g. animate-ui\'s',
    ' * `src/components/animate-ui/`) come from upstream verbatim and',
    ' * don\'t carry the project\'s banner / import-order / max-lines',
    ' * conventions. This config disables those rules on those paths',
    ' * only — `eslint.config.js` lazy-imports this file at the very end',
    ' * of its rule list, so this file does NOT exist for `--ui custom`.',
    ' *',
    ' * Regenerate by re-running `npx create-eikon-react` with the same',
    ` * \`--ui ${ui}\` flag, or by editing this file in place if you want`,
    ' * to tighten the lint surface.',
    ' */',
    '',
    'export default [',
    '  {',
    '    files: [',
    `${filesLiteral},`,
    '    ],',
    '    rules: {',
    `${rulesLiteral},`,
    '    },',
    '  },',
    '];',
    '',
  ].join('\n');
}

async function writeUiSnapshotEslintOverride(
  projectDir: string,
  ui: UiVariant
): Promise<void> {
  if (ui === 'custom') return;
  const text = buildUiSnapshotEslintConfig(ui);
  if (!text) return;
  await writeFile(
    path.join(projectDir, UI_SNAPSHOT_ESLINT_FILE),
    text,
    'utf8'
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { REPLACEABLE_UI_FILES, buildUiSnapshotEslintConfig };
export const UI_SNAPSHOT_ESLINT_FILE = 'eslint.config.ui-snapshot.js';
