/**
 * @file simulate-strip-walk.ts
 * @description Recursive template-tree walk for `simulateStripTree`.
 * Mirrors the CLI's `stripFeatures()` directory walk: it descends
 * `template-react/`, applies the path-level keep/drop rules, and emits
 * the surviving POSIX-relative paths. Internal to `simulate-strip.ts`;
 * not part of the preview server's public surface.
 */

import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { isReplaceableUiFile } from '../../create-eikon-react/src/apply-ui-snapshot';
import {
  type FeatureFlags,
  type VariantSelections,
} from '../../create-eikon-react/src/strip-features';
import { TEMPLATE_COPY_SKIP } from '../../create-eikon-react/src/skip-list';

import { TEMPLATE_REACT_DIR } from './builder';
import {
  passesDirectoryRules,
  passesFileLevelMarkers,
  passesPlatformRootFiles,
} from './simulate-strip-filters';

export interface TreeWalkResult {
  /** POSIX-relative paths the template walk kept under the inputs. */
  kept: string[];
  /**
   * Basenames of replaceable `src/shared/ui/*` primitives whose template
   * counterpart survived strip. The CLI's `applyUiSnapshot` only restores
   * snapshot UI files whose counterpart was kept (e.g. `sheet.tsx` is gone
   * unless `layout=mobile-drawer`), so the snapshot merge must filter the
   * snapshot list against this set or it drifts.
   */
  survivors: Set<string>;
}

/**
 * Walk `template-react/` and collect the paths that survive the
 * path-level strip rules. When `useSnapshot` is set, replaceable
 * `src/shared/ui/*` primitives are recorded in `survivors` and dropped
 * from `kept` (the snapshot OWNS those paths and re-adds them later).
 */
export async function walkTemplateTree(
  flags: FeatureFlags,
  variants: VariantSelections,
  disabled: ReadonlySet<string>,
  useSnapshot: boolean
): Promise<TreeWalkResult> {
  const kept: string[] = [];
  const survivors = new Set<string>();

  async function walk(absDir: string): Promise<void> {
    const rel = path.relative(TEMPLATE_REACT_DIR, absDir).replace(/\\/g, '/');
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
      if (!(await passesFileLevelMarkers(childAbs, flags, variants, disabled))) {
        continue;
      }
      // Record `survivors` so the snapshot pass can mirror the CLI's
      // per-file filter, but drop the project's own copy from the listed
      // tree because the snapshot OWNS that path under `useSnapshot`.
      if (useSnapshot && isReplaceable) {
        survivors.add(childRel.slice('src/shared/ui/'.length));
        continue;
      }
      kept.push(childRel);
    }
  }

  await walk(TEMPLATE_REACT_DIR);
  return { kept, survivors };
}
