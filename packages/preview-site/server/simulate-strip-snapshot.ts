/**
 * @file simulate-strip-snapshot.ts
 * @description UI-snapshot resolution for the strip simulator. Mirrors
 * `applyUiSnapshot` (create-eikon-react/src/apply-ui-snapshot.ts): which
 * snapshot files ride along, the empty-snapshot fallback, and the
 * snapshot-owned content lookup that bypasses the template-side strip.
 * Internal to `simulate-strip.ts`; not part of the preview server's
 * public surface.
 */

import path from 'node:path';

import {
  buildUiSnapshotEslintConfig,
  isReplaceableUiFile,
  listSnapshotFiles,
  readSnapshotFile,
  REPLACEABLE_UI_FILES,
  UI_SNAPSHOT_ESLINT_FILE,
} from '../../create-eikon-react/src/apply-ui-snapshot';
import {
  type FeatureFlags,
  type VariantSelections,
} from '../../create-eikon-react/src/strip-features';

import { TEMPLATE_REACT_DIR, UI_SNAPSHOTS_ROOT } from './builder';
import { type BuildInputs } from './hash';
import { passesFileLevelMarkers } from './simulate-strip-filters';

export interface SnapshotResolution {
  /** Files the snapshot ships, relative to the project root. */
  snapshotFiles: string[];
  /**
   * Whether the snapshot owns the replaceable `src/shared/ui/*` files.
   * Mirrors `applyUiSnapshot`'s empty-snapshot fallback: when the
   * snapshot ships no UI files, the CLI keeps the project's owned copies,
   * so the simulator must too or it drifts.
   */
  useSnapshot: boolean;
}

/**
 * Resolve the snapshot file list + `useSnapshot` flag for `inputs`.
 * `ui === 'custom'` short-circuits to an empty, snapshot-off result.
 */
export async function resolveSnapshot(
  inputs: BuildInputs
): Promise<SnapshotResolution> {
  const ui = inputs.ui;
  const snapshotFiles =
    ui !== 'custom' ? await listSnapshotFiles(ui, UI_SNAPSHOTS_ROOT) : [];
  const useSnapshot =
    ui !== 'custom' && snapshotFiles.some((rel) => isReplaceableUiFile(rel));
  return { snapshotFiles, useSnapshot };
}

/**
 * Resolve the content of a snapshot-owned file (under `useSnapshot`).
 *
 * Returns the snapshot text when this path is one the CLI's
 * `applyUiSnapshot` writes after the strip walk; returns `null` to signal
 * a 404 for a replaceable primitive whose template counterpart was
 * stripped (e.g. `sheet.tsx` on a non-mobile layout); returns
 * `{ fallThrough: true }` when the snapshot doesn't own the path and the
 * caller should continue with the normal template strip.
 */
export async function resolveSnapshotFileContent(
  relPath: string,
  inputs: BuildInputs,
  flags: FeatureFlags,
  variants: VariantSelections,
  disabled: ReadonlySet<string>
): Promise<{ text: string | null } | { fallThrough: true }> {
  const ui = inputs.ui;

  // A replaceable UI primitive whose template counterpart would have been
  // stripped out must NOT be served — the CLI doesn't restore it, so the
  // panel must report 404 to stay parity-clean.
  if (isReplaceableUiFile(relPath)) {
    const templateAbs = path.join(TEMPLATE_REACT_DIR, relPath);
    const survivedStrip = await passesFileLevelMarkers(
      templateAbs,
      flags,
      variants,
      disabled
    );
    if (!survivedStrip) return { text: null };
    return { text: await readSnapshotFile(ui, relPath, UI_SNAPSHOTS_ROOT) };
  }
  if (relPath === 'components.json') {
    return { text: await readSnapshotFile(ui, relPath, UI_SNAPSHOTS_ROOT) };
  }
  // The CLI stamps `eslint.config.ui-snapshot.js` next to
  // `eslint.config.js` to relax project-shaped rules on the vendored
  // primitives. Build it inline so the panel shows the exact text the
  // user gets on disk.
  if (
    relPath === UI_SNAPSHOT_ESLINT_FILE &&
    (ui === 'shadcn' || ui === 'animate-ui')
  ) {
    return {
      text: await buildUiSnapshotEslintConfig(
        ui,
        path.join(UI_SNAPSHOTS_ROOT, ui)
      ),
    };
  }
  // Extra files the snapshot ships under `src/` (e.g. animate-ui hooks).
  // Try the snapshot first; fall through to the template path if the
  // snapshot doesn't own this file.
  if (relPath.startsWith('src/')) {
    const snap = await readSnapshotFile(ui, relPath, UI_SNAPSHOTS_ROOT);
    if (snap !== null) return { text: snap };
  }
  return { fallThrough: true };
}

/**
 * Append the snapshot's file list to the template-walk result `kept`,
 * mirroring the CLI's post-strip `applyUiSnapshot`. Replaceable UI
 * primitives only ride along when their template counterpart survived
 * the strip (`survivors`); other snapshot files come through
 * unconditionally. The UI-snapshot eslint override is stamped at the
 * project root for `shadcn` / `animate-ui`. Mutates `kept` in place.
 */
export function appendSnapshotFilesToTree(
  kept: string[],
  snapshotFiles: string[],
  survivors: ReadonlySet<string>,
  ui: BuildInputs['ui']
): void {
  for (const rel of snapshotFiles) {
    if (rel.startsWith('src/shared/ui/')) {
      const rest = rel.slice('src/shared/ui/'.length);
      if (
        !rest.includes('/') &&
        REPLACEABLE_UI_FILES.includes(rest) &&
        !survivors.has(rest)
      ) {
        continue;
      }
    }
    kept.push(rel);
  }
  // Mirror `writeUiSnapshotEslintOverride` — the CLI stamps this file at
  // the project root for every non-`custom` UI choice.
  if (ui === 'shadcn' || ui === 'animate-ui') {
    kept.push(UI_SNAPSHOT_ESLINT_FILE);
  }
}
