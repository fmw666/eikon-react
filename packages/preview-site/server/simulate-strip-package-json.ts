/**
 * @file simulate-strip-package-json.ts
 * @description `package.json` text transforms for the strip simulator:
 * the CLI's `pruneDependencies` + `prunePackageScripts` passes (string
 * in/out, no fs writes) and the snapshot `package-deps.json` merge.
 * Internal to `simulate-strip.ts`; not part of the preview server's
 * public surface.
 */

import {
  FEATURE_DEPS,
  PLATFORM_SCRIPT_TAGS,
  type FeatureFlags,
  type VariantSelections,
} from '../../create-eikon-react/src/strip-features';
import {
  rewritePackageJsonForPackageManager,
  type PackageManager,
} from '../../create-eikon-react/src/rewrite-package-manager';

import { disabledFeaturesFromFlags } from './simulate-strip-inputs';

/**
 * Mirror the CLI's `pruneDependencies` + `prunePackageScripts` passes,
 * but on a string in/out — no fs writes.
 */
export function prunePackageJson(
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
export function mergeSnapshotDepsIntoPackageJson(
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
