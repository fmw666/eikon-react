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

import { TEMPLATE_REACT_DIR } from './builder';
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
 */
export async function simulateStripTree(
  inputs: BuildInputs
): Promise<string[]> {
  const flags = flagsFromInputs(inputs);
  const variants = variantsFromInputs(inputs);
  const disabled = disabledFeaturesFromFlags(flags);
  const kept: string[] = [];

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
      if (!(await passesFileLevelMarkers(childAbs, flags, variants, disabled)))
        continue;
      kept.push(childRel);
    }
  }

  await walk(TEMPLATE_REACT_DIR);
  kept.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  return kept;
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
    return prunePackageJson(raw, flags, variants, packageManagerFromInputs(inputs));
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
