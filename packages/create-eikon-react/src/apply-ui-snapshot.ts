/**
 * @file apply-ui-snapshot.ts
 * @description Lays the chosen `--ui` library's pre-baked snapshot files
 * over the project's `src/shared/ui/`, splices the matching
 * `components.json` into the project root, and merges the snapshot's
 * dependency pins into `package.json`.
 *
 * The `ui` axis stopped being a runtime CSS-class swap in Phase J — the
 * three options now actually change which component implementations
 * ship:
 *
 *   --ui custom      project-authored Radix wrappers (the files already
 *                    in template/src/shared/ui/). NO-OP for this fn.
 *   --ui shadcn      official shadcn registry components, copied from
 *                    template-snapshots/shadcn/.
 *   --ui animate-ui  animate-ui registry components, copied from
 *                    template-snapshots/animate-ui/.
 *
 * Why pre-baked snapshots instead of fetching from the registry at
 * scaffold time:
 *   - Offline scaffolds keep working (pnpm dlx, air-gapped CI).
 *   - The user gets a reproducible result tied to the CLI version they
 *     installed, not whatever the registry happens to serve today.
 *   - Upstream churn is reviewed by maintainers via
 *     `scripts/sync-ui-snapshots.mjs`, not by random users at scaffold
 *     time.
 *
 * Snapshot directory layout (sibling to template/, not inside it — the
 * sync-template.mjs script wipes template/ before each rebuild, so
 * snapshots living inside template/ would be deleted on every CLI
 * publish prep):
 *
 *   template-snapshots/<ui>/
 *     src/shared/ui/<file>.tsx       (replaces project counterpart)
 *     components.json                (placed at project root)
 *     package-deps.json              (merged into project package.json)
 *
 * Internal helpers live in sibling files (`*.constants.ts`, `*.fs.ts`,
 * `*.eslint.ts`); this file owns the public API and orchestration. The
 * public exports and import path are unchanged.
 */

// =================================================================================================
// Imports
// =================================================================================================

import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import {
  REPLACEABLE_UI_FILES,
  UI_DIR_REL,
  UI_SNAPSHOT_ESLINT_FILE,
  defaultSnapshotsRoot,
  isUiVariant,
  pathExists,
  uiVariantList,
} from './apply-ui-snapshot.constants.js';
import type { UiVariant } from './apply-ui-snapshot.constants.js';
import {
  copyDirRecursive,
  mergePackageDeps,
  shouldCopySnapshotEntry,
} from './apply-ui-snapshot.fs.js';
import {
  buildUiSnapshotEslintConfig,
  writeUiSnapshotEslintOverride,
} from './apply-ui-snapshot.eslint.js';
import {
  getSnapshotDir,
  isReplaceableUiFile,
  listSnapshotFiles,
  readSnapshotDeps,
  readSnapshotFile,
} from './apply-ui-snapshot.read.js';

// The read-only query API lives in `./apply-ui-snapshot.read.js`;
// re-exported here verbatim so the public import path
// (`apply-ui-snapshot.ts`) keeps the same surface for every importer.
export {
  getSnapshotDir,
  isReplaceableUiFile,
  listSnapshotFiles,
  readSnapshotDeps,
  readSnapshotFile,
};

// =================================================================================================
// Public API
// =================================================================================================

/**
 * Replace the project's `src/shared/ui/*` library files with the chosen
 * snapshot, drop in `components.json`, and merge `package-deps.json`
 * into the project's `package.json`. For `--ui custom`, scrubs any
 * orphans a previous snapshot may have left under `projectDir` (matters
 * when the same dir is reused — e.g. preview-site cache reuse — never
 * for a fresh scaffold).
 *
 * Callers run this AFTER `stripFeatures` (so any feature-strip rules
 * have already pruned files) and BEFORE `rewritePackageManagerFields`
 * (so the deps merge happens on the same package.json the rewriter
 * mutates).
 */
export async function applyUiSnapshot(
  projectDir: string,
  ui: string,
  snapshotsRoot: string = defaultSnapshotsRoot()
): Promise<void> {
  if (!isUiVariant(ui)) {
    throw new Error(
      `[applyUiSnapshot] unknown ui variant: ${ui} ` +
        `(expected one of: ${uiVariantList()})`
    );
  }
  // Scrub any leftover snapshot artefacts before bailing on `custom` —
  // re-running this fn over a tree that previously had `--ui shadcn`
  // would otherwise leave `components.json`, the snapshot eslint
  // override, and any animate-ui-only subtrees behind. Cheap on a fresh
  // scaffold (every unlink is ENOENT-ignored).
  await scrubSnapshotArtefacts(projectDir);
  if (ui === 'custom') return;

  const snapshotDir = path.join(snapshotsRoot, ui);
  if (!(await pathExists(snapshotDir))) {
    throw new Error(
      `[applyUiSnapshot] missing snapshot directory: ${snapshotDir} — ` +
        `run \`pnpm sync-ui-snapshots\` to regenerate.`
    );
  }

  // Empty-snapshot fallback. The snapshot dir exists but ships no UI
  // files (e.g. the maintainer hasn't run `sync-ui-snapshots` yet, or
  // an upstream registry update broke the sync mid-way). Treat as
  // no-op rather than wiping the project's owned UI files and leaving
  // dangling imports — the user gets a working `--ui custom` shape
  // with the chosen `--ui` value pinned in components.json (if the
  // snapshot ships one). Once the snapshot is populated, this branch
  // simply stops triggering.
  //
  // Loud, not silent — we tell the user the choice didn't materialise
  // so they don't think their `--ui animate-ui` flag did anything.
  const snapshotFiles = await listSnapshotFiles(ui, snapshotsRoot);
  const hasUiFiles = snapshotFiles.some((rel) => isReplaceableUiFile(rel));
  if (!hasUiFiles) {
    console.warn(
      `[create-eikon-react] WARN: \`--ui ${ui}\` snapshot at ` +
        `${snapshotDir} ships no UI primitives — falling back to ` +
        `the project-authored \`custom\` set. Run \`pnpm sync-ui-snapshots\` ` +
        `(maintainer task) to populate it.`
    );
    return;
  }

  // 1. Decide which replaceable primitives survived `stripFeatures`.
  //    Files like `sheet.tsx` carry `// @eikon:variant(layout=...) file`
  //    markers — when the user's layout doesn't need them, the strip
  //    pass deleted them already, and we MUST NOT resurrect them via
  //    the snapshot (the corresponding feature code that imports them
  //    has also been stripped, so a resurrected sheet.tsx would be
  //    dead code at best, an unused-import lint error at worst).
  const projectUiDir = path.join(projectDir, UI_DIR_REL);
  const survivors = new Set<string>();
  if (await pathExists(projectUiDir)) {
    for (const name of REPLACEABLE_UI_FILES) {
      if (await pathExists(path.join(projectUiDir, name))) {
        survivors.add(name);
      }
    }
    for (const name of survivors) {
      await rm(path.join(projectUiDir, name), { force: true });
    }
  } else {
    await mkdir(projectUiDir, { recursive: true });
  }

  // 2. Copy the snapshot's tree over. For replaceable primitives under
  //    `src/shared/ui/`, only copy files whose counterpart survived the
  //    strip pass (see step 1). Everything else (animate-ui's
  //    `src/components/`, `src/hooks/`, `src/lib/`) copies through
  //    unconditionally.
  const snapshotSrc = path.join(snapshotDir, 'src');
  if (await pathExists(snapshotSrc)) {
    await copyDirRecursive(
      snapshotSrc,
      path.join(projectDir, 'src'),
      (relPosix) => shouldCopySnapshotEntry(relPosix, survivors)
    );
  }

  // 3. Drop `components.json` at the project root if the snapshot
  //    provides one. shadcn / animate-ui both read it for further
  //    `add` operations the user runs post-scaffold.
  const componentsJson = path.join(snapshotDir, 'components.json');
  if (await pathExists(componentsJson)) {
    await copyFile(componentsJson, path.join(projectDir, 'components.json'));
  }

  // 4. Merge dependency pins into package.json. The snapshot ships
  //    only the deps the chosen library NEEDS — additive merge,
  //    snapshot wins on overlap (e.g. animate-ui pinning a specific
  //    `motion` version).
  await mergePackageDeps(projectDir, snapshotDir);

  // 5. Stamp `eslint.config.ui-snapshot.js`. The snapshot files don't
  //    follow the project's banner / import-order / max-lines
  //    conventions, and rewriting them on the way in would defeat
  //    the point of "use the upstream library verbatim". The main
  //    `eslint.config.js` lazy-imports this file when present and
  //    no-ops when it isn't — so `--ui custom` and the template-react
  //    package itself stay strict on their own project-authored
  //    primitives.
  await writeUiSnapshotEslintOverride(projectDir, ui, snapshotDir);
}

/**
 * Remove any orphan artefacts a previous snapshot run may have written
 * into `projectDir`. Idempotent and ENOENT-tolerant — safe to call on a
 * fresh scaffold (every removal is a no-op there). Necessary when the
 * same dir is reused across `applyUiSnapshot` invocations (preview-site
 * cache reuse, manual re-scaffold over the same target) so a previous
 * `--ui shadcn` run doesn't leave `components.json` /
 * `eslint.config.ui-snapshot.js` lying around when the new run is
 * `--ui custom`, or animate-ui-only subtrees when the new run is shadcn.
 */
async function scrubSnapshotArtefacts(projectDir: string): Promise<void> {
  await Promise.all([
    rm(path.join(projectDir, 'components.json'), { force: true }),
    rm(path.join(projectDir, UI_SNAPSHOT_ESLINT_FILE), { force: true }),
    rm(path.join(projectDir, 'src', 'components', 'animate-ui'), {
      force: true,
      recursive: true,
    }),
    rm(path.join(projectDir, 'src', 'hooks'), {
      force: true,
      recursive: true,
    }),
    rm(path.join(projectDir, 'src', 'lib'), {
      force: true,
      recursive: true,
    }),
  ]);
}

// =================================================================================================
// Exports
// =================================================================================================

export type { UiVariant };
export {
  REPLACEABLE_UI_FILES,
  UI_SNAPSHOT_ESLINT_FILE,
  buildUiSnapshotEslintConfig,
};
