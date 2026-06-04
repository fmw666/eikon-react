/**
 * @file apply-ui-snapshot.read.ts
 * @description Read-only snapshot query API: resolve a snapshot dir,
 * list its files, read a single file, read its dependency pins, and the
 * `isReplaceableUiFile` predicate. NOT a public entrypoint — these are
 * re-exported verbatim from `apply-ui-snapshot.ts` so importers keep the
 * same path. Split out so the main file holds only the `applyUiSnapshot`
 * orchestration plus its design rationale.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  REPLACEABLE_UI_FILES,
  UI_DIR_REL,
  defaultSnapshotsRoot,
  isUiVariant,
  pathExists,
} from './apply-ui-snapshot.constants.js';
import type { PackageDepsFile } from './apply-ui-snapshot.constants.js';
import { walkSnapshotDir } from './apply-ui-snapshot.fs.js';

/**
 * True when `relPath` (POSIX-separated) names one of the seven UI
 * primitives the snapshot OWNS. The simulator uses this to decide
 * whether to read from `src/shared/ui/...` in the template-react tree
 * or from the snapshot dir for the chosen `ui`.
 */
export function isReplaceableUiFile(relPath: string): boolean {
  const expected = REPLACEABLE_UI_FILES.map(
    (name) => `${UI_DIR_REL.replace(/\\/g, '/')}/${name}`
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
