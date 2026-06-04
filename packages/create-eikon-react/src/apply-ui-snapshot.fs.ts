/**
 * @file apply-ui-snapshot.fs.ts
 * @description Internal filesystem helpers for the `apply-ui-snapshot`
 * module: the bounded-concurrency snapshot-copy walk, the snapshot-dir
 * file walk, the copy-filter decision, and the `package.json` deps
 * merge. NOT a public entrypoint — consumed by `apply-ui-snapshot.ts`.
 */

import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

import { runWithConcurrency } from './strip-features.js';
import {
  REPLACEABLE_UI_FILES,
  pathExists,
} from './apply-ui-snapshot.constants.js';
import type { PackageDepsFile } from './apply-ui-snapshot.constants.js';

/**
 * Concurrency cap for the snapshot-copy walk. Snapshots are small
 * (≤ ~30 files for animate-ui's superset), and the cap is per-directory
 * — child dirs get their own pass. 8 keeps in-flight fds modest while
 * still saturating IO on cold disks.
 */
const SNAPSHOT_COPY_CONCURRENCY = 8;

export async function copyDirRecursive(
  src: string,
  dest: string,
  filter?: (relPosix: string) => boolean,
  rel: string = ''
): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  // Recurse into subdirectories sequentially (bounded depth, predictable
  // fd usage) but race the leaf-file copyFile calls — that's where the
  // wall-clock wins are. Empirically the snapshot has 1–2 nested levels
  // and 5–25 files per dir, so flattening to a single mass copy is
  // unnecessary.
  const fileTasks: Array<() => Promise<void>> = [];
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    const next = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      await copyDirRecursive(s, d, filter, next);
    } else if (e.isFile()) {
      if (filter && !filter(next)) continue;
      fileTasks.push(() => copyFile(s, d));
    }
  }
  await runWithConcurrency(fileTasks, SNAPSHOT_COPY_CONCURRENCY);
}

/**
 * Decides whether a snapshot tree entry should be copied into the
 * scaffolded project. Replaceable primitives under `src/shared/ui/`
 * only copy when their counterpart survived `stripFeatures` (the
 * `survivors` set). Everything else copies through.
 */
export function shouldCopySnapshotEntry(
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

export async function walkSnapshotDir(
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

export async function mergePackageDeps(
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
