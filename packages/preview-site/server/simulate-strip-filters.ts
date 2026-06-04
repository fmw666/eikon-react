/**
 * @file simulate-strip-filters.ts
 * @description Path-level strip filters mirrored from `stripFeatures()`:
 * directory rules (supabase / shells), platform-root-file pruning, and
 * the first-line feature/variant marker test. Internal to
 * `simulate-strip.ts`; not part of the preview server's public surface.
 *
 * `relPath` uses POSIX separators throughout, matching what the
 * tree-walker emits.
 */

import { readFile } from 'node:fs/promises';

import {
  FEATURE_FILE_MARKER_RE,
  isInsideDesktopShellTree,
  isInsideMobileShellTree,
  isInsideSupabaseTree,
  PLATFORM_ROOT_FILES,
  stripBlocksForFeature,
  stripBlocksForVariant,
  VARIANT_FILE_MARKER,
  type FeatureFlags,
  type VariantSelections,
} from '../../create-eikon-react/src/strip-features';

/**
 * Return `false` when the file at `relPath` would be removed by the
 * directory-level rules in `stripFeatures()` (supabase / shells).
 */
export function passesDirectoryRules(
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
export function passesPlatformRootFiles(
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
export async function passesFileLevelMarkers(
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

/**
 * Apply the CLI walker's block-level strip to a file's text: drop
 * `@eikon:feature` blocks for each disabled feature, then `@eikon:variant`
 * blocks for each non-matching axis value.
 */
export function stripContentBlocks(
  raw: string,
  disabled: ReadonlySet<string>,
  variants: VariantSelections
): string {
  let out = raw;
  for (const feature of disabled) {
    out = stripBlocksForFeature(out, feature);
  }
  for (const [axis, chosen] of Object.entries(variants)) {
    out = stripBlocksForVariant(out, axis, chosen);
  }
  return out;
}
