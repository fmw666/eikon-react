/**
 * @file apply-ui-snapshot.constants.ts
 * @description Internal constants, types, and path helpers shared by the
 * `apply-ui-snapshot` module. NOT a public entrypoint — import the
 * re-exports from `apply-ui-snapshot.ts` instead. Kept beside the main
 * file so the data tables (`REPLACEABLE_UI_FILES`) and the variant
 * guard live next to the snapshot logic that consumes them.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stat } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Files in `src/shared/ui/` that the snapshot OWNS — these are deleted
 * before the snapshot is laid down so the project doesn't end up with a
 * mix of project-authored and registry-authored primitives. Files NOT
 * in this list (`theme-toggle.tsx`, `language-switcher.tsx`, anything
 * future) survive untouched across all `--ui` choices.
 *
 * Kept as basenames; `applyUiSnapshot` joins them against the project's
 * `src/shared/ui/` dir.
 */
export const REPLACEABLE_UI_FILES: readonly string[] = [
  'button.tsx',
  'dialog.tsx',
  'tabs.tsx',
  'sheet.tsx',
  'command.tsx',
  'card.tsx',
  'toaster.tsx',
  // Form + display primitives shipped by the design-system audit pass
  // (Phase 4). Every entry below MUST exist in the same shape across
  // the template AND every snapshot under template-snapshots/* —
  // missing the snapshot copy means `--ui shadcn` / `--ui animate-ui`
  // will delete the project's owned file without putting an
  // equivalent back.
  'input.tsx',
  'textarea.tsx',
  'label.tsx',
  'select.tsx',
  'checkbox.tsx',
  'radio-group.tsx',
  'switch.tsx',
  'badge.tsx',
  'avatar.tsx',
  'skeleton.tsx',
  'tooltip.tsx',
  'popover.tsx',
  'alert.tsx',
] as const;

export const UI_DIR_REL = path.join('src', 'shared', 'ui');

export const UI_SNAPSHOT_ESLINT_FILE = 'eslint.config.ui-snapshot.js';

export type UiVariant = 'custom' | 'shadcn' | 'animate-ui';

const UI_VARIANTS: ReadonlySet<UiVariant> = new Set([
  'custom',
  'shadcn',
  'animate-ui',
]);

/** Human-readable list of accepted `--ui` values, for error messages. */
export function uiVariantList(): string {
  return Array.from(UI_VARIANTS).join(', ');
}

export function isUiVariant(v: string): v is UiVariant {
  return UI_VARIANTS.has(v as UiVariant);
}

export interface PackageDepsFile {
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}

/**
 * Default snapshots root — sibling of `template/` inside the
 * create-eikon-react package. Resolves correctly both at
 * compile-output (dist/) and source-import (src/) time because
 * `__dirname/..` is always `packages/create-eikon-react/` in either
 * layout. Callers that bundle this module out-of-tree (e.g. the
 * preview-site if it ever stops importing the TS source directly)
 * should pass `snapshotsRoot` explicitly to override.
 */
export function defaultSnapshotsRoot(): string {
  return path.resolve(__dirname, '..', 'template-snapshots');
}

export async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}
