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
 * The rules mirrored here are the same ones `stripFeatures()` enforces:
 *   - Skip the centralized `TEMPLATE_COPY_SKIP` set (build artefacts,
 *     IDE state, lockfiles that don't propagate).
 *   - Drop `src/shared/supabase` when supabase is disabled.
 *   - Drop `apps/<other-shell>` for non-matching platforms.
 *   - Drop files whose first line is `@eikon:feature(<name>) file`
 *     for any disabled feature.
 *   - Drop files whose first line is `@eikon:variant(<axis>=<value>) file`
 *     where the chosen value differs from `<value>`.
 *   - Drop `pnpm-workspace.yaml` on platforms that don't keep it.
 *   - Apply `stripBlocksForFeature` / `stripBlocksForVariant` to file
 *     content (matching the CLI walker).
 *   - Prune `package.json` `dependencies` (per disabled feature) and
 *     `scripts` (per non-matching platform).
 *
 * The drift test in Phase J cross-checks every (platform, supabase)
 * combination by running real `stripFeatures()` against a temp dir and
 * diffing the resulting tree against `simulateStripTree()`. Any rule
 * that gets added to the CLI side without being mirrored here will
 * fail that test.
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  buildUiSnapshotEslintConfig,
  isReplaceableUiFile,
  listSnapshotFiles,
  readSnapshotDeps,
  readSnapshotFile,
  REPLACEABLE_UI_FILES,
  UI_SNAPSHOT_ESLINT_FILE,
} from '../../create-eikon-react/src/apply-ui-snapshot';
import {
  FEATURE_DEPS,
  FEATURE_FILE_MARKER_RE,
  isInsideDesktopShellTree,
  isInsideMobileShellTree,
  isInsideSupabaseTree,
  PLATFORM_ROOT_FILES,
  PLATFORM_SCRIPT_TAGS,
  stripBlocksForFeature,
  stripBlocksForVariant,
  VARIANT_FILE_MARKER,
  type FeatureFlags,
  type VariantSelections,
} from '../../create-eikon-react/src/strip-features';
import { rewriteHtmlOpenTag } from '../../create-eikon-react/src/inject-html-variants';
import {
  rewritePackageJsonForPackageManager,
  type PackageManager,
} from '../../create-eikon-react/src/rewrite-package-manager';
import { TEMPLATE_COPY_SKIP } from '../../create-eikon-react/src/skip-list';

import { TEMPLATE_REACT_DIR, UI_SNAPSHOTS_ROOT } from './builder';
import { type BuildInputs } from './hash';

// ---------------------------------------------------------------------------
// Input normalisation — keep simulator & builder reading the same shape
// ---------------------------------------------------------------------------

function flagsFromInputs(inputs: BuildInputs): FeatureFlags {
  return {
    supabase: !!inputs.supabase,
  };
}

function variantsFromInputs(inputs: BuildInputs): VariantSelections {
  return {
    platform: inputs.platform,
    design: inputs.design,
    layout: inputs.layout,
    ui: inputs.ui,
    toastPosition: inputs.toastPosition,
  };
}

function packageManagerFromInputs(inputs: BuildInputs): PackageManager {
  return inputs.pm === 'npm' || inputs.pm === 'bun' ? inputs.pm : 'pnpm';
}

function disabledFeaturesFromFlags(flags: FeatureFlags): Set<string> {
  const disabled = new Set<string>();
  if (!flags.supabase) disabled.add('supabase');
  return disabled;
}

// ---------------------------------------------------------------------------
// Path-level filters
// ---------------------------------------------------------------------------

/**
 * Return `false` when the file at `relPath` would be removed by the
 * directory-level rules in `stripFeatures()` (supabase / shells).
 *
 * `relPath` uses POSIX separators throughout, matching what the
 * tree-walker emits.
 */
function passesDirectoryRules(
  relPath: string,
  flags: FeatureFlags,
  variants: VariantSelections
): boolean {
  if (!flags.supabase && isInsideSupabaseTree(relPath)) return false;
  const platform = variants['platform'];
  if (platform !== 'desktop' && isInsideDesktopShellTree(relPath)) return false;
  if (platform !== 'mobile' && isInsideMobileShellTree(relPath)) return false;
  return true;
}

/** Drop `pnpm-workspace.yaml` on platforms that don't keep it. */
function passesPlatformRootFiles(
  relPath: string,
  variants: VariantSelections
): boolean {
  const platform = variants['platform'];
  if (!platform) return true;
  for (const entry of PLATFORM_ROOT_FILES) {
    if (relPath === entry.path && !entry.keepFor.includes(platform)) {
      return false;
    }
  }
  return true;
}

/**
 * Read the first line and decide whether the file's first-line marker
 * (feature-file or variant-file) drops it under the given inputs. The
 * caller must also have content available for block-strip; this helper
 * focuses on the cheap "does the file even exist after strip" check.
 *
 * Reads at most the first ~256 bytes for the marker test, falling back
 * to the full read when the file is short. The walker already has the
 * full content in hand for content-emission; this helper exists for
 * the tree-only path that doesn't need text.
 */
async function passesFileLevelMarkers(
  absPath: string,
  flags: FeatureFlags,
  variants: VariantSelections,
  disabled: ReadonlySet<string>
): Promise<boolean> {
  let raw: string;
  try {
    raw = await readFile(absPath, 'utf8');
  } catch {
    // Binary or unreadable file — treat as kept; the CLI walker also
    // skips marker tests on binaries.
    return true;
  }
  const featureMatch = raw.match(FEATURE_FILE_MARKER_RE);
  if (featureMatch && disabled.has(featureMatch[1]!)) return false;
  const variantMatch = raw.match(VARIANT_FILE_MARKER);
  if (variantMatch) {
    const axis = variantMatch[1]!;
    const value = variantMatch[2]!;
    const chosen = variants[axis];
    if (chosen !== undefined && chosen !== value) return false;
  }
  // Reference flags so this helper still type-checks if its body
  // ever stops branching on disabled (safety net for future edits).
  void flags;
  return true;
}

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
  const ui = inputs.ui;
  const snapshotFiles =
    ui !== 'custom' ? await listSnapshotFiles(ui, UI_SNAPSHOTS_ROOT) : [];
  // Mirror `applyUiSnapshot`'s empty-snapshot fallback: when the
  // snapshot ships no UI files, the CLI keeps the project's owned
  // copies — so the panel must too, or the simulator drifts.
  const useSnapshot =
    ui !== 'custom' &&
    snapshotFiles.some((rel) => isReplaceableUiFile(rel));
  const kept: string[] = [];
  // Track which replaceable primitives survived the template-side strip.
  // The CLI's `applyUiSnapshot` only restores snapshot UI files whose
  // counterpart was kept (e.g. `sheet.tsx` is gone unless `layout=mobile-drawer`),
  // so the simulator must filter the snapshot list the same way or drift.
  const survivors = new Set<string>();

  async function walk(absDir: string): Promise<void> {
    const rel = path
      .relative(TEMPLATE_REACT_DIR, absDir)
      .replace(/\\/g, '/');
    let entries;
    try {
      entries = await readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (TEMPLATE_COPY_SKIP.has(entry.name)) continue;
      const childAbs = path.join(absDir, entry.name);
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (!passesDirectoryRules(childRel, flags, variants)) continue;
      if (!passesPlatformRootFiles(childRel, variants)) continue;
      if (entry.isDirectory()) {
        await walk(childAbs);
        continue;
      }
      if (!entry.isFile()) continue;
      const isReplaceable = isReplaceableUiFile(childRel);
      // For replaceable UI files we still need to know if the original
      // would have survived strip (record `survivors` so the snapshot
      // pass below can mirror the CLI's per-file filter), but we always
      // drop the project's own copy from the listed tree because the
      // snapshot OWNS that path under `useSnapshot`.
      if (
        !(await passesFileLevelMarkers(childAbs, flags, variants, disabled))
      ) {
        continue;
      }
      if (useSnapshot && isReplaceable) {
        const basename = childRel.slice('src/shared/ui/'.length);
        survivors.add(basename);
        continue;
      }
      kept.push(childRel);
    }
  }

  await walk(TEMPLATE_REACT_DIR);

  if (useSnapshot) {
    for (const rel of snapshotFiles) {
      // Replaceable UI primitives only ride along when their original
      // counterpart survived strip (mirrors `shouldCopySnapshotEntry`
      // in `apply-ui-snapshot.ts`). Other snapshot files (animate-ui's
      // `src/components/`, `src/hooks/`, `src/lib/`, `components.json`)
      // come through unconditionally.
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
    // Mirror `writeUiSnapshotEslintOverride` — the CLI stamps this
    // file at the project root for every non-`custom` UI choice.
    if (ui === 'shadcn' || ui === 'animate-ui') {
      kept.push(UI_SNAPSHOT_ESLINT_FILE);
    }
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
  // Mirror `applyUiSnapshot`'s empty-snapshot fallback (see
  // simulateStripTree for the full rationale).
  const snapshotFiles =
    ui !== 'custom' ? await listSnapshotFiles(ui, UI_SNAPSHOTS_ROOT) : [];
  const useSnapshot =
    ui !== 'custom' &&
    snapshotFiles.some((rel) => isReplaceableUiFile(rel));

  // 1. Snapshot-owned file paths. These bypass every template-side
  //    rule because the CLI also writes them after the strip walk
  //    (see applyUiSnapshot in create-eikon-react/src/apply-ui-snapshot.ts).
  //    Exception: a replaceable UI primitive whose template counterpart
  //    would have been stripped out (e.g. `sheet.tsx` on a non-mobile
  //    layout) must NOT be served — the CLI doesn't restore it, so the
  //    panel must report 404 to stay parity-clean.
  if (useSnapshot) {
    if (isReplaceableUiFile(relPath)) {
      const templateAbs = path.join(TEMPLATE_REACT_DIR, relPath);
      const survivedStrip = await passesFileLevelMarkers(
        templateAbs,
        flags,
        variants,
        disabled
      );
      if (!survivedStrip) return null;
      return await readSnapshotFile(ui, relPath, UI_SNAPSHOTS_ROOT);
    }
    if (relPath === 'components.json') {
      return await readSnapshotFile(ui, relPath, UI_SNAPSHOTS_ROOT);
    }
    // The CLI stamps `eslint.config.ui-snapshot.js` next to
    // `eslint.config.js` to relax project-shaped rules on the
    // vendored primitives. Build it inline so the panel shows the
    // exact text the user gets on disk.
    if (relPath === UI_SNAPSHOT_ESLINT_FILE && (ui === 'shadcn' || ui === 'animate-ui')) {
      return buildUiSnapshotEslintConfig(ui);
    }
    // Extra files the snapshot ships under `src/` (e.g. animate-ui
    // hooks). Try the snapshot first; fall through to the template
    // path if the snapshot doesn't own this file.
    if (relPath.startsWith('src/')) {
      const snap = await readSnapshotFile(ui, relPath, UI_SNAPSHOTS_ROOT);
      if (snap !== null) return snap;
    }
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
    let out = raw;
    for (const feature of disabled) {
      out = stripBlocksForFeature(out, feature);
    }
    for (const [axis, chosen] of Object.entries(variants)) {
      out = stripBlocksForVariant(out, axis, chosen);
    }
    return rewriteHtmlOpenTag(out, variants);
  }

  let out = raw;
  for (const feature of disabled) {
    out = stripBlocksForFeature(out, feature);
  }
  for (const [axis, chosen] of Object.entries(variants)) {
    out = stripBlocksForVariant(out, axis, chosen);
  }
  return out;
}

/**
 * Mirror the CLI's `pruneDependencies` + `prunePackageScripts` passes,
 * but on a string in/out — no fs writes.
 */
function prunePackageJson(
  raw: string,
  flags: FeatureFlags,
  variants: VariantSelections,
  pm: PackageManager
): string {
  let pkg: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };
  try {
    pkg = JSON.parse(raw);
  } catch {
    return raw;
  }

  // Disabled-feature deps.
  const disabled = disabledFeaturesFromFlags(flags);
  const depsToRemove = new Set<string>();
  for (const feature of disabled) {
    for (const dep of FEATURE_DEPS[feature] ?? []) depsToRemove.add(dep);
  }
  for (const section of ['dependencies', 'devDependencies'] as const) {
    const map = pkg[section];
    if (!map) continue;
    for (const dep of depsToRemove) delete map[dep];
  }

  // Non-matching platform scripts.
  const platform = variants['platform'];
  if (platform && pkg.scripts) {
    const scriptsToDrop = new Set<string>();
    for (const [tag, scripts] of Object.entries(PLATFORM_SCRIPT_TAGS)) {
      if (tag === platform) continue;
      for (const s of scripts) scriptsToDrop.add(s);
    }
    for (const key of scriptsToDrop) delete pkg.scripts[key];
  }

  const pruned = JSON.stringify(pkg, null, 2) + '\n';
  return rewritePackageJsonForPackageManager(pruned, pm);
}

/**
 * Splice the snapshot's `package-deps.json` into the already-pruned
 * `package.json` text. Mirrors `mergePackageDeps` in `applyUiSnapshot`:
 * the snapshot's pins win on overlap (e.g. animate-ui pinning a
 * specific `motion` version), and both sections are sorted.
 */
function mergeSnapshotDepsIntoPackageJson(
  pkgText: string,
  add: { dependencies: Record<string, string>; devDependencies: Record<string, string> }
): string {
  const hasAdds =
    Object.keys(add.dependencies).length > 0 ||
    Object.keys(add.devDependencies).length > 0;
  if (!hasAdds) return pkgText;

  let pkg: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    [k: string]: unknown;
  };
  try {
    pkg = JSON.parse(pkgText);
  } catch {
    return pkgText;
  }

  const sortDeps = (deps: Record<string, string>): Record<string, string> => {
    const sorted: Record<string, string> = {};
    for (const k of Object.keys(deps).sort()) sorted[k] = deps[k]!;
    return sorted;
  };

  pkg.dependencies = sortDeps({
    ...(pkg.dependencies ?? {}),
    ...add.dependencies,
  });
  if (Object.keys(add.devDependencies).length > 0) {
    pkg.devDependencies = sortDeps({
      ...(pkg.devDependencies ?? {}),
      ...add.devDependencies,
    });
  }
  return JSON.stringify(pkg, null, 2) + '\n';
}
