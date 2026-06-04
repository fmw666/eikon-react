/**
 * @file prune.ts
 * @description File-/directory-level removal passes that run alongside the
 * marker strip: dependency pruning, platform-script pruning, platform-only
 * root-file pruning, and the empty-`apps/` cleanup. Extracted from
 * `strip-features.ts` so the orchestrator there reads as a sequence of named
 * passes. Each pass is exported so unit tests can drive it on a fixture
 * without spinning up the whole pipeline.
 */

import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { type VariantSelections } from './variant-types';

export const PACKAGE_DEPS_BY_FEATURE: Record<string, string[]> = {
  supabase: ['@supabase/supabase-js'],
  // TanStack Query (`@tanstack/react-query`) is treated as baseline
  // infrastructure alongside React / React Router / i18next — every
  // scaffold ships with it. If a future template strips it, its deps
  // would go here.
  //
  // `examples` used to live here (pruning `web-vitals` /
  // `@tanstack/react-virtual` / `cmdk`), but the showcase is now shipped
  // unconditionally — the runtime `import.meta.env.DEV` gate in
  // `app/router.tsx` keeps the routes out of production bundles, so end
  // users carry the source but pay nothing in their built app.
};

/**
 * Remove the `apps/` parent directory if (and only if) it's empty
 * after the shell-level deletes. We don't recurse on purpose: any
 * surviving entry inside `apps/` means the user opted into a
 * platform that needs the directory, and removing it would break
 * their build.
 */
export async function pruneEmptyAppsDir(root: string): Promise<void> {
  const apps = path.join(root, 'apps');
  let entries: string[];
  try {
    entries = await readdir(apps);
  } catch {
    return; // apps/ doesn't exist — nothing to do.
  }
  if (entries.length === 0) {
    await rm(apps, { recursive: true, force: true });
  }
}

export async function pruneDependencies(
  root: string,
  disabled: ReadonlySet<string>
): Promise<void> {
  const pkgPath = path.join(root, 'package.json');
  const raw = await readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(raw) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const toRemove = new Set<string>();
  for (const feature of disabled) {
    for (const dep of PACKAGE_DEPS_BY_FEATURE[feature] ?? []) {
      toRemove.add(dep);
    }
  }

  if (toRemove.size === 0) return;

  for (const section of ['dependencies', 'devDependencies'] as const) {
    const map = pkg[section];
    if (!map) continue;
    for (const dep of toRemove) delete map[dep];
  }

  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

/**
 * Platform-keyed script tags. The root `package.json` ships every
 * scaffold-time script in one block (so the unstripped template tree
 * passes lint / typecheck / `pnpm install` on its own); on strip we drop
 * the scripts whose tag doesn't match the chosen platform. Maintained
 * here rather than as JSON5 comments inside `package.json` because
 * standard JSON doesn't accept comments and we don't want to fork to
 * JSON5 just for one axis.
 *
 * The map is hard-coded; new platforms just add a key. The CLI's
 * `VARIANT_CHOICES.platform` and the playground schema's
 * `platform.values` must stay in sync with this map's keys (verified by
 * the platform e2e scenarios).
 */
export const PLATFORM_SCRIPTS: Record<string, readonly string[]> = {
  desktop: ['tauri', 'tauri:dev', 'tauri:build'],
  mobile: [
    'cap',
    'cap:sync',
    'cap:add:ios',
    'cap:add:android',
    'cap:open:ios',
    'cap:open:android',
    'cap:run:ios',
    'cap:run:android',
  ],
  web: [],
};

/**
 * Drop platform-specific scripts from the root `package.json` whose tag
 * doesn't match the chosen platform. Runs as a final pass after the
 * file-tree walk; safe to call when no platform is set (no-op).
 *
 * Exported so unit tests can run it on a fixture `package.json`
 * directly without spinning up the whole strip pipeline.
 */
export async function prunePackageScripts(
  root: string,
  variants: VariantSelections
): Promise<void> {
  const platform = variants['platform'];
  if (!platform) return;
  const pkgPath = path.join(root, 'package.json');
  let raw: string;
  try {
    raw = await readFile(pkgPath, 'utf8');
  } catch {
    return; // No package.json at root — nothing to do (e.g. apps/* sub-roots).
  }
  const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
  if (!pkg.scripts) return;

  const toDrop = new Set<string>();
  for (const [tag, scripts] of Object.entries(PLATFORM_SCRIPTS)) {
    if (tag === platform) continue;
    for (const s of scripts) toDrop.add(s);
  }
  if (toDrop.size === 0) return;

  let changed = false;
  for (const key of toDrop) {
    if (key in pkg.scripts) {
      delete pkg.scripts[key];
      changed = true;
    }
  }
  if (!changed) return;
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

/**
 * Root-level files that are tied to a specific platform and have no
 * comment syntax, so they can't carry an inline marker. Each entry is
 * pruned when the chosen platform is NOT in the entry's keep-set.
 *
 * `pnpm-workspace.yaml`: declares `apps/*` as workspace packages so the
 *   root `tauri:*` / `cap:*` scripts can do `pnpm --filter ./apps/...`.
 *   On `--platform web` the entire `apps/` directory is removed by the
 *   directory walk above and the workspace filters are dropped by
 *   `prunePackageScripts`, so the workspace declaration becomes inert.
 *   Removing the file keeps the scaffold strictly single-package and
 *   leaves the user free to opt into a workspace later (recreate the
 *   file, add a `packages/` glob, etc.).
 *
 * Maintained as a small inline table rather than a comment-marker
 * approach because YAML accepts `#` comments but the file is small
 * enough that a whole-file delete is simpler than block stripping.
 */
export const PLATFORM_ONLY_ROOT_FILES: ReadonlyArray<{
  readonly path: string;
  readonly keepFor: ReadonlyArray<string>;
}> = [
  {
    path: 'pnpm-workspace.yaml',
    keepFor: ['desktop', 'mobile'],
  },
];

/**
 * Delete platform-only root files when the chosen platform isn't in the
 * file's keep-set. No-op when `variants.platform` is missing (preserves
 * backward compat with feature-only callers).
 *
 * Exported for unit tests; CLI / e2e callers reach it via `stripFeatures`.
 */
export async function prunePlatformOnlyRootFiles(
  root: string,
  variants: VariantSelections
): Promise<void> {
  const platform = variants['platform'];
  if (!platform) return;
  for (const entry of PLATFORM_ONLY_ROOT_FILES) {
    if (entry.keepFor.includes(platform)) continue;
    const target = path.join(root, entry.path);
    await rm(target, { force: true });
  }
}
