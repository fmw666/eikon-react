/**
 * @file simulate-strip.ts
 * @description Pure-function preview of `npx create-eikon-react` output.
 *
 * Phase F decouples the playground's left-side files panel from the
 * Vite build cache. Pre-Phase-F, the panel walked `getCacheDir(hash)`
 * and read whatever `stripFeatures()` had written there — which meant
 * the panel could only show files for the (platform, supabase, design,
 * ui, layout, toastPosition) tuple the user had actually built. Now
 * that runtime-switchable axes don't trigger a rebuild, the cache dirs
 * each contain *all* axis values' source on disk; the panel needs a
 * different source of truth.
 *
 * `simulateStripTree(inputs)` returns the relative paths the CLI would
 * have produced for the same inputs — **without ever touching disk**
 * other than reading the in-repo template. `simulateStripFileContent`
 * does the same for a single file's text content (block-strip applied,
 * unchosen variant blocks removed, feature-gated lines gone).
 *
 * Result: switching design/ui/layout/toastPosition/platform/supabase
 * in the playground re-renders the file panel from a sub-second
 * pure-function pass instead of a viteBuild round-trip.
 *
 * The strip rules mirrored from `stripFeatures()` live in the sibling
 * modules this file composes:
 *   - `simulate-strip-inputs.ts`   — normalise `BuildInputs` → flags /
 *     variants / package-manager / disabled-feature set.
 *   - `simulate-strip-filters.ts`  — path-level keep/drop (supabase &
 *     shell dirs, `pnpm-workspace.yaml`, first-line feature/variant
 *     markers) and the `@eikon:` block-strip content transform.
 *   - `simulate-strip-snapshot.ts` — UI-snapshot resolution + snapshot
 *     -owned file content / tree merge (mirrors `applyUiSnapshot`).
 *   - `simulate-strip-package-json.ts` — JSON dependency / script prune
 *     and the snapshot `package-deps.json` merge.
 *
 * The drift test in Phase J cross-checks every (platform, supabase)
 * combination by running real `stripFeatures()` against a temp dir and
 * diffing the resulting tree against `simulateStripTree()`. Any rule
 * that gets added to the CLI side without being mirrored here (or in a
 * sibling module) will fail that test.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { readSnapshotDeps } from '../../create-eikon-react/src/apply-ui-snapshot';
import { rewriteHtmlOpenTag } from '../../create-eikon-react/src/inject-html-variants';

import { TEMPLATE_REACT_DIR, UI_SNAPSHOTS_ROOT } from './builder';
import { type BuildInputs } from './hash';
import {
  disabledFeaturesFromFlags,
  flagsFromInputs,
  packageManagerFromInputs,
  variantsFromInputs,
} from './simulate-strip-inputs';
import {
  passesDirectoryRules,
  passesFileLevelMarkers,
  passesPlatformRootFiles,
  stripContentBlocks,
} from './simulate-strip-filters';
import {
  mergeSnapshotDepsIntoPackageJson,
  prunePackageJson,
} from './simulate-strip-package-json';
import {
  appendSnapshotFilesToTree,
  resolveSnapshot,
  resolveSnapshotFileContent,
} from './simulate-strip-snapshot';
import { walkTemplateTree } from './simulate-strip-walk';

// ---------------------------------------------------------------------------
// Public entry — tree
// ---------------------------------------------------------------------------

/**
 * Walk template-react/ and return the POSIX-relative paths the CLI
 * would have kept under `inputs`. Result is sorted (dirs before files,
 * case-insensitive) so callers can dedupe / display directly.
 *
 * For `ui !== 'custom'` the seven files in `src/shared/ui/` that the
 * snapshot owns are dropped from the template walk and replaced with
 * the snapshot's own file list (which may also ship `components.json`
 * at the project root and any extra paths under `src/` the registry
 * decided to bundle, e.g. animate-ui hooks).
 */
export async function simulateStripTree(
  inputs: BuildInputs
): Promise<string[]> {
  const flags = flagsFromInputs(inputs);
  const variants = variantsFromInputs(inputs);
  const disabled = disabledFeaturesFromFlags(flags);
  const { snapshotFiles, useSnapshot } = await resolveSnapshot(inputs);

  const { kept, survivors } = await walkTemplateTree(
    flags,
    variants,
    disabled,
    useSnapshot
  );

  if (useSnapshot) {
    appendSnapshotFilesToTree(kept, snapshotFiles, survivors, inputs.ui);
  }

  // De-duplicate (snapshot can re-add a path the template walk also
  // emitted, e.g. if a snapshot ships an extra hook the template
  // happens to ship too) and sort.
  const dedup = Array.from(new Set(kept));
  dedup.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  return dedup;
}

// ---------------------------------------------------------------------------
// Public entry — single file content
// ---------------------------------------------------------------------------

/**
 * Read a single file from template-react/ and apply the same
 * block-level strip + JSON pruning the CLI does.
 *
 * Returns:
 *   - the post-strip text on success.
 *   - `null` when the file would have been removed entirely (file-level
 *     marker mismatch, directory rule, etc.). Callers should surface
 *     this as 404.
 *
 * For `ui !== 'custom'` the seven `src/shared/ui/*` files the snapshot
 * owns, plus any extra files the snapshot ships (`components.json`,
 * extra hooks under `src/`), are read directly from the snapshot dir.
 * `package.json` gets the snapshot's `package-deps.json` merged into
 * its dependencies (matching what `applyUiSnapshot` does on disk).
 *
 * `relPath` is template-relative, POSIX-separated. Path-traversal
 * (`..`) is caller-rejected.
 */
export async function simulateStripFileContent(
  relPath: string,
  inputs: BuildInputs
): Promise<string | null> {
  const flags = flagsFromInputs(inputs);
  const variants = variantsFromInputs(inputs);
  const disabled = disabledFeaturesFromFlags(flags);
  const ui = inputs.ui;
  const { useSnapshot } = await resolveSnapshot(inputs);

  // 1. Snapshot-owned file paths. These bypass every template-side rule
  //    because the CLI also writes them after the strip walk (see
  //    applyUiSnapshot in create-eikon-react/src/apply-ui-snapshot.ts).
  //    `resolveSnapshotFileContent` returns a resolved `{ text }` for any
  //    path the snapshot owns, or `{ fallThrough }` to continue below.
  if (useSnapshot) {
    const resolved = await resolveSnapshotFileContent(
      relPath,
      inputs,
      flags,
      variants,
      disabled
    );
    if ('text' in resolved) return resolved.text;
  }

  if (!passesDirectoryRules(relPath, flags, variants)) return null;
  if (!passesPlatformRootFiles(relPath, variants)) return null;

  const abs = path.join(TEMPLATE_REACT_DIR, relPath);
  let raw: string;
  try {
    raw = await readFile(abs, 'utf8');
  } catch {
    return null;
  }

  if (!(await passesFileLevelMarkers(abs, flags, variants, disabled))) {
    return null;
  }

  // Special-case `package.json` so the dependency / script prune the CLI
  // performs at the JSON level shows up in the panel content too.
  if (relPath === 'package.json') {
    const pruned = prunePackageJson(
      raw,
      flags,
      variants,
      packageManagerFromInputs(inputs)
    );
    if (!useSnapshot) return pruned;
    const deps = await readSnapshotDeps(ui, UI_SNAPSHOTS_ROOT);
    return mergeSnapshotDepsIntoPackageJson(pruned, deps);
  }

  // Special-case `index.html` so the panel reflects the same variant
  // attrs the CLI bakes onto `<html>` post-strip via `injectHtmlVariants`.
  // Without this, every panel preview of `index.html` would diverge from
  // what `npx create-eikon-react --<args>` actually writes to disk.
  if (relPath === 'index.html') {
    return rewriteHtmlOpenTag(
      stripContentBlocks(raw, disabled, variants),
      variants
    );
  }

  return stripContentBlocks(raw, disabled, variants);
}
