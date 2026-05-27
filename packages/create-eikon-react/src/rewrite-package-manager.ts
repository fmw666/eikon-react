/**
 * @file rewrite-package-manager.ts
 * @description Rewrite the package-manager-flavoured fields of the
 * scaffolded `package.json` to match the user's `--pm` choice.
 *
 * The template is authored with pnpm in mind:
 *   - `engines.pnpm` pins the supported pnpm range.
 *   - `packageManager` declares pnpm via Corepack's spec.
 *   - `check` / `ci` aggregate scripts call sub-scripts via `pnpm run`.
 *
 * Without this rewrite, a user picking `--pm npm` (or `bun`) ends up
 * with a project whose own scripts insist on pnpm — `npm run check`
 * would shell out to `pnpm run typecheck` and fail with "command not
 * found" when pnpm isn't installed globally.
 *
 * Workspace-scoped scripts (`tauri:*`, `cap:*`) use `pnpm --filter ...`
 * which is a pnpm-only feature; the desktop/mobile shells in
 * `apps/*` further depend on `pnpm-workspace.yaml`. There is no clean
 * cross-PM equivalent, so the CLI snaps `--pm` to `pnpm` when the
 * platform is `desktop` or `mobile` (see `resolvePackageManager` in
 * `index.ts`); by the time we get here for a non-pnpm PM, the platform
 * is web and those scripts have already been pruned by
 * `prunePackageScripts`. We therefore only need to rewrite the
 * surviving aggregate scripts (`check`, `ci`).
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type PackageManager = 'pnpm' | 'npm' | 'bun';

interface PMSpec {
  /** Corepack-compatible `packageManager` field value. */
  readonly packageManager: string;
  /** `engines.<key>` to write, replacing the template's `pnpm` entry. */
  readonly engineKey: PackageManager;
  /** Semver range for `engines.<key>`. */
  readonly engineRange: string;
  /** What `pnpm run X` becomes; left empty for pnpm. */
  readonly runCommand: string;
}

/**
 * Per-PM constants. Versions match what's in CI / docs as the minimum
 * supported floor — bumping these is a deliberate breaking change.
 */
const PM_SPECS: Record<PackageManager, PMSpec> = {
  pnpm: {
    packageManager: 'pnpm@9.12.0',
    engineKey: 'pnpm',
    engineRange: '>=9.0.0',
    runCommand: 'pnpm run',
  },
  npm: {
    packageManager: 'npm@10.9.0',
    engineKey: 'npm',
    engineRange: '>=10.0.0',
    runCommand: 'npm run',
  },
  bun: {
    packageManager: 'bun@1.1.30',
    engineKey: 'bun',
    engineRange: '>=1.1.0',
    runCommand: 'bun run',
  },
};

/**
 * Rewrite `package.json` for the chosen PM. No-op on pnpm (the template
 * is already pnpm-flavoured). Returns silently when the file is missing
 * — minimal fixtures used in unit tests don't always ship one.
 */
export async function rewritePackageManagerFields(
  targetDir: string,
  pm: PackageManager
): Promise<void> {
  if (pm === 'pnpm') return;

  const pkgPath = path.join(targetDir, 'package.json');
  let raw: string;
  try {
    raw = await readFile(pkgPath, 'utf8');
  } catch {
    return;
  }

  const next = rewritePackageJsonForPackageManager(raw, pm);
  if (next === raw) return;
  await writeFile(pkgPath, next, 'utf8');
}

/**
 * Pure string-in/string-out variant used by the preview simulator so the
 * code panel can show the same `package.json` a real CLI scaffold would
 * write for `--pm npm|bun`.
 */
export function rewritePackageJsonForPackageManager(
  raw: string,
  pm: PackageManager
): string {
  if (pm === 'pnpm') return raw;

  const pkg = JSON.parse(raw) as {
    engines?: Record<string, string>;
    packageManager?: string;
    scripts?: Record<string, string>;
  };

  const spec = PM_SPECS[pm];

  // `engines`: drop the pnpm pin, add the chosen PM. `node` stays put.
  if (pkg.engines && typeof pkg.engines === 'object') {
    delete pkg.engines.pnpm;
    pkg.engines[spec.engineKey] = spec.engineRange;
  }

  pkg.packageManager = spec.packageManager;

  // Scripts: replace `pnpm run X` → `<pm> run X`. We deliberately do
  // NOT touch `pnpm --filter ...` because:
  //   - on desktop/mobile platforms `--pm` is snapped to pnpm upstream,
  //     so we never see a non-pnpm rewrite request there;
  //   - on web the workspace-filter scripts have already been pruned by
  //     `prunePackageScripts`, so there's nothing to touch.
  if (pkg.scripts) {
    for (const [name, cmd] of Object.entries(pkg.scripts)) {
      if (typeof cmd !== 'string') continue;
      pkg.scripts[name] = cmd.replace(/\bpnpm run\b/g, spec.runCommand);
    }
  }

  return JSON.stringify(pkg, null, 2) + '\n';
}
