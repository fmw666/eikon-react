/**
 * @file strip-features.ts
 * @description Orchestrates the template strip: walk the project tree, delete
 * feature-/variant-owned files and directories, and run the marker engine over
 * every text file. The supporting pieces were split into focused modules so
 * this file reads as the pipeline:
 *   - marker grammar + block strip → `markers.ts`
 *   - binary detection            → `binary-detect.ts`
 *   - dependency/script/dir prune → `prune.ts`
 *   - shared types                → `variant-types.ts`
 * Every public name those modules expose is re-exported here so existing
 * `from './strip-features'` imports (CLI, preview server, tests) are unchanged.
 */

import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_VARIANTS,
  type StripOptions,
  type VariantSelections,
} from './variant-types';
import {
  BLOCK_RE,
  FILE_MARKER_RE,
  VARIANT_FILE_MARKER_RE,
  stripBlocksForFeature,
  stripBlocksForVariant,
} from './markers';
import { isBinary } from './binary-detect';
import {
  PACKAGE_DEPS_BY_FEATURE,
  PLATFORM_ONLY_ROOT_FILES,
  PLATFORM_SCRIPTS,
  pruneDependencies,
  pruneEmptyAppsDir,
  prunePackageScripts,
  prunePlatformOnlyRootFiles,
} from './prune';

// Re-export the shared types/values so `from './strip-features'` keeps working.
export { DEFAULT_VARIANTS };
export type { StripOptions, VariantSelections };

/**
 * Feature flags the scaffolder knows about. Kept defined here (rather than in
 * `variant-types.ts`) as the single source of truth: the `feature-parity`
 * drift test reads this interface from this file's source, and only this
 * module consumes it. Adding a field requires a matching
 * `PACKAGE_DEPS_BY_FEATURE` entry (if it strips deps) and a `resolveFeatures`
 * assignment in `index.ts` — both enforced by `feature-parity.test.ts`.
 */
export interface FeatureFlags {
  supabase: boolean;
}

/**
 * Walk the project tree and remove code/files corresponding to disabled
 * features and to non-chosen variants.
 *
 * `variants` is required: every caller (CLI's `index.ts`, the playground's
 * `builder.ts`, every test) constructs an explicit selection. A
 * fallback default would silently mask regressions where variants
 * accidentally drop from the call site.
 */
export async function stripFeatures(
  root: string,
  flags: FeatureFlags,
  variants: VariantSelections,
  options: StripOptions = {}
): Promise<void> {
  const disabled = new Set<string>();
  if (!flags.supabase) disabled.add('supabase');
  // The `examples` feature used to be stripped by default — end users
  // were considered to never want a template-internal showcase in their
  // scaffolded project. That decision was reversed: examples now ships
  // unconditionally so the playground's file panel matches the scaffold
  // output 1:1, and so end users can browse the showcase locally with
  // `npm run dev`. Production bundles stay clean via the runtime
  // `import.meta.env.DEV` gate in `app/router.tsx` — `pnpm build` /
  // `vite build` evaluates that gate to `false`, tree-shaking the
  // routes out. The `@eikon:feature(examples)` markers across the
  // template tree are now inert (no consumer adds 'examples' to
  // `disabled`), but they're left in place as documentation and as a
  // ready hook should the strip ever need to come back.

  await walkAndStrip(root, disabled, variants, options);
  await pruneDependencies(root, disabled);
  // Platform-aware script pruning. Runs after the file-tree walk so the
  // shell directories' deletion above and the script pruning here move
  // in lock-step — never delete `apps/desktop/` while keeping `tauri:*`
  // scripts that point at it.
  if (!options.keepShells) {
    await prunePackageScripts(root, variants);
    await prunePlatformOnlyRootFiles(root, variants);
    // After the per-shell deletes above, `apps/` may be left as an
    // empty directory (e.g. on `--platform web`, both `apps/desktop`
    // and `apps/mobile` are gone). The structural guards in scaffolded
    // projects assert "apps/ either has a known shell OR is absent",
    // and `pnpm-workspace.yaml` is dropped on web — so an orphan empty
    // `apps/` would be both ugly and a structural-test failure.
    await pruneEmptyAppsDir(root);
  }
}

/**
 * Cap on the per-directory leaf-file concurrency. The template is small
 * (~60 files), so a single high cap (32) keeps the queue empty without
 * risking too many open fds on machines with tight ulimits.
 */
const FILE_CONCURRENCY = 32;

async function walkAndStrip(
  dir: string,
  disabled: ReadonlySet<string>,
  variants: VariantSelections,
  options: StripOptions
): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  const fileTasks: Array<() => Promise<void>> = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (
      entry.name === 'node_modules' ||
      entry.name === 'dist' ||
      entry.name === '.git'
    ) {
      continue;
    }
    if (entry.isDirectory()) {
      // If a directory's purpose is exclusively tied to a feature, drop it whole.
      if (disabled.has('supabase') && isInsideSupabaseDir(full)) {
        await rm(full, { recursive: true, force: true });
        continue;
      }
      // Platform shell directories: drop unless the chosen platform
      // matches AND the playground hasn't asked us to keep them. The
      // preview opts out via `keepShells: true` so platform-switching
      // in the playground stays cache-cheap.
      if (!options.keepShells) {
        const platform = variants['platform'];
        if (isInsideDesktopShellDir(full) && platform !== 'desktop') {
          await rm(full, { recursive: true, force: true });
          continue;
        }
        if (isInsideMobileShellDir(full) && platform !== 'mobile') {
          await rm(full, { recursive: true, force: true });
          continue;
        }
      }
      // Directories still recurse sequentially — bounded depth in the
      // template tree means there's nothing to gain from racing them,
      // and serial recursion keeps fd usage predictable.
      await walkAndStrip(full, disabled, variants, options);
      continue;
    }
    if (!entry.isFile()) continue;
    fileTasks.push(() => stripFile(full, disabled, variants, options));
  }
  // Leaf-file work is independent and IO-bound (read → maybe write).
  // Running them with a small concurrency bound trims wall-clock time
  // noticeably on directories with many marker-bearing siblings (e.g.
  // src/styles/, src/shared/ui/).
  await runWithConcurrency(fileTasks, FILE_CONCURRENCY);
}

/**
 * Run an array of async tasks with at most `limit` in flight at a time.
 *
 * Returns `void`: every caller in this module discards the resolved
 * values (the tasks themselves perform IO side-effects on the strip
 * target), so retaining a results array forced an allocation + an
 * unused `Promise<unknown[]>` shape callers had to ignore. The earlier
 * iteration returned `T[]` for symmetry with `Promise.all`, which the
 * audit flagged as semantic dead weight.
 *
 * If a future caller genuinely needs the resolved values, prefer
 * `Promise.all` (with manual chunking) or reintroduce an overload —
 * don't sneak the array back in by default; the discard is part of
 * this helper's contract now.
 */
async function runWithConcurrency(
  tasks: ReadonlyArray<() => Promise<unknown>>,
  limit: number
): Promise<void> {
  if (tasks.length <= 1) {
    if (tasks.length === 1) await tasks[0]!();
    return;
  }
  let next = 0;
  async function worker(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= tasks.length) return;
      await tasks[i]!();
    }
  }
  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => worker()
  );
  await Promise.all(workers);
}

/**
 * True iff `p` (absolute path with mixed separators OR a POSIX-relative
 * template-rooted path) is one of `segments` itself or a descendant of
 * any of them. Replaces six near-duplicate predicates that each
 * normalised separators inline before checking a single segment.
 *
 * `segments` are POSIX-relative path roots (e.g. `'src/shared/supabase'`,
 * `'apps/desktop'`). The rule is intentionally segment-aware: matching
 * `'src/shared/supabase'` does NOT match `'src/shared/supabase-helpers'`
 * because the comparison uses path-component boundaries.
 */
function isInsideAny(p: string, segments: readonly string[]): boolean {
  const norm = p.replace(/\\/g, '/');
  for (const seg of segments) {
    if (norm === seg || norm.endsWith(`/${seg}`)) return true;
    if (norm.includes(`/${seg}/`)) return true;
    if (norm.startsWith(`${seg}/`)) return true;
  }
  return false;
}

const SUPABASE_SEGMENTS = ['src/shared/supabase'] as const;
const DESKTOP_SHELL_SEGMENTS = ['apps/desktop'] as const;
const MOBILE_SHELL_SEGMENTS = ['apps/mobile'] as const;

function isInsideSupabaseDir(p: string): boolean {
  const norm = p.replace(/\\/g, '/');
  return norm.endsWith('/src/shared/supabase');
}

function isInsideDesktopShellDir(p: string): boolean {
  const norm = p.replace(/\\/g, '/');
  return norm.endsWith('/apps/desktop');
}

function isInsideMobileShellDir(p: string): boolean {
  const norm = p.replace(/\\/g, '/');
  return norm.endsWith('/apps/mobile');
}

async function stripFile(
  file: string,
  disabled: ReadonlySet<string>,
  variants: VariantSelections,
  options: StripOptions
): Promise<void> {
  if (await isBinary(file)) return;
  const raw = await readFile(file, 'utf8');

  // File ownership wins over block-level work: if the file is tied to a
  // disabled feature or a non-chosen variant we can simply delete it.
  const fileMatch = raw.match(FILE_MARKER_RE);
  if (fileMatch && disabled.has(fileMatch[1]!)) {
    await rm(file, { force: true });
    return;
  }

  // Variant file-level strip: removes orphan variant siblings (e.g. the
  // 3 unchosen layouts) so the scaffolded project only carries the user's
  // selection. The playground opts out via `keepAllVariantFiles` (drops
  // the whole pass) or `keepAllVariants` (per-axis exclusion — used to
  // keep all `layout=*` files while still letting `platform=*` strip).
  if (!options.keepAllVariantFiles) {
    const variantFileMatch = raw.match(VARIANT_FILE_MARKER_RE);
    if (variantFileMatch) {
      const axis = variantFileMatch[1]!;
      const value = variantFileMatch[2]!;
      const chosen = variants[axis];
      const axisKept = options.keepAllVariants?.includes(axis) ?? false;
      if (!axisKept && chosen !== undefined && chosen !== value) {
        await rm(file, { force: true });
        return;
      }
    }
  }

  let out = raw;
  for (const feature of disabled) {
    out = stripBlocksForFeature(out, feature);
  }
  for (const [axis, chosen] of Object.entries(variants)) {
    // Skip block-level strip for runtime-switchable axes the playground
    // opted out of (design / ui / layout / toastPosition). Marker
    // comments stay in source — they're inert.
    if (options.keepAllVariants?.includes(axis)) continue;
    out = stripBlocksForVariant(out, axis, chosen);
  }

  if (out !== raw) {
    await writeFile(file, out, 'utf8');
  }
}

// ---------------------------------------------------------------------------
// Backward-compatible re-exports
// ---------------------------------------------------------------------------

// Re-export for potential reuse in tests.
export { stripBlocksForFeature, stripBlocksForVariant, runWithConcurrency };
// Reference exported helpers so unused-export lints don't trigger.
export const __BLOCK_RE_FOR_TESTS = BLOCK_RE;

// Marker regexes + prune passes, re-exposed for the preview server's
// `simulate-strip.ts` and for unit tests. Importantly: these are
// load-bearing for CLI users too (the regexes power `stripFile`), so any
// breaking edit is caught by CLI strip tests and the playground drift test
// (Phase J) in lock-step.
export { prunePackageScripts, prunePlatformOnlyRootFiles };

export const FEATURE_FILE_MARKER_RE = FILE_MARKER_RE;
export const VARIANT_FILE_MARKER = VARIANT_FILE_MARKER_RE;

/** Map: feature name → npm deps removed when the feature is disabled. */
export const FEATURE_DEPS = PACKAGE_DEPS_BY_FEATURE;

/** Map: platform name → `package.json` scripts gated to that platform. */
export const PLATFORM_SCRIPT_TAGS = PLATFORM_SCRIPTS;

/**
 * Root-level files that exist only for certain platforms. Each entry
 * carries the platforms whose scaffolds should KEEP the file; for any
 * other platform the file is dropped from the tree.
 */
export const PLATFORM_ROOT_FILES = PLATFORM_ONLY_ROOT_FILES;

/**
 * Predicate flavours of the directory-level removal rules. The CLI's
 * strip walker uses inline checks (it has the absolute path); the
 * simulator works with relative POSIX paths so it gets a normalised
 * version here.
 *
 * `relPath` is template-relative and POSIX-separated, e.g.
 * `'apps/desktop/src-tauri/Cargo.toml'`.
 */
export function isInsideSupabaseTree(relPath: string): boolean {
  return isInsideAny(relPath, SUPABASE_SEGMENTS);
}
export function isInsideDesktopShellTree(relPath: string): boolean {
  return isInsideAny(relPath, DESKTOP_SHELL_SEGMENTS);
}
export function isInsideMobileShellTree(relPath: string): boolean {
  return isInsideAny(relPath, MOBILE_SHELL_SEGMENTS);
}
