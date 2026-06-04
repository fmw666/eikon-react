/**
 * @file apply-ui-snapshot.eslint.ts
 * @description Builds the `eslint.config.ui-snapshot.js` override block
 * emitted by `applyUiSnapshot` for non-`custom` UI variants. The
 * vendored UI primitives come from upstream verbatim and don't follow
 * the project's banner / import-order / max-lines conventions, so this
 * config relaxes those rules on the vendored paths only. NOT a public
 * entrypoint — `buildUiSnapshotEslintConfig` is re-exported from
 * `apply-ui-snapshot.ts`.
 */

import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  REPLACEABLE_UI_FILES,
  UI_SNAPSHOT_ESLINT_FILE,
  pathExists,
} from './apply-ui-snapshot.constants.js';
import type { UiVariant } from './apply-ui-snapshot.constants.js';

/**
 * Files under `src/shared/ui/` whose lint rules the snapshot relaxes.
 * Mirrors `REPLACEABLE_UI_FILES` but expressed as ESLint glob entries.
 */
const SNAPSHOT_UI_FILE_GLOBS = REPLACEABLE_UI_FILES.map(
  (name) => `src/shared/ui/${name}`
);

const SNAPSHOT_RULES_OFF = {
  'eikon/file-header-banner': 'off',
  'eikon/filename-matches-export': 'off',
  'eikon/filename-case-by-path': 'off',
  'import/no-default-export': 'off',
  'import/order': 'off',
  'max-lines': 'off',
  '@typescript-eslint/consistent-type-imports': 'off',
  'react-refresh/only-export-components': 'off',
} as const;

/**
 * Walk the snapshot's `src/` tree and return one glob per top-level
 * subdirectory the snapshot ships, EXCEPT `shared/ui/` (already covered
 * by per-file globs in `SNAPSHOT_UI_FILE_GLOBS`). Empty array when the
 * snapshot ships nothing outside `src/shared/ui/` (today this is the
 * shadcn shape).
 *
 * Derived rather than hard-coded so a future shadcn registry that
 * starts shipping `src/hooks/` or `src/lib/` doesn't silently lint-fail
 * on the snapshot files until someone remembers to update a list here.
 */
async function deriveExtraEslintGlobs(snapshotDir: string): Promise<string[]> {
  const srcDir = path.join(snapshotDir, 'src');
  if (!(await pathExists(srcDir))) return [];
  const entries = await readdir(srcDir, { withFileTypes: true });
  const out: string[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name === 'shared') continue;
    out.push(`src/${e.name}/**/*.{ts,tsx}`);
  }
  return out.sort();
}

export async function buildUiSnapshotEslintConfig(
  ui: UiVariant,
  snapshotDir: string
): Promise<string> {
  if (ui === 'custom') return '';
  const extraGlobs = await deriveExtraEslintGlobs(snapshotDir);
  const files = [...SNAPSHOT_UI_FILE_GLOBS, ...extraGlobs];
  const filesLiteral = files.map((f) => `    '${f}'`).join(',\n');
  const rulesLiteral = Object.entries(SNAPSHOT_RULES_OFF)
    .map(([k, v]) => `    '${k}': '${v}'`)
    .join(',\n');
  return [
    '/**',
    ' * @file eslint.config.ui-snapshot.js',
    ` * @description Override block emitted by \`applyUiSnapshot\` for \`--ui ${ui}\`.`,
    ' *',
    ' * The vendored UI primitives under `src/shared/ui/` (and any extra',
    ' * helper paths the registry ships, e.g. animate-ui\'s',
    ' * `src/components/animate-ui/`) come from upstream verbatim and',
    ' * don\'t carry the project\'s banner / import-order / max-lines',
    ' * conventions. This config disables those rules on those paths',
    ' * only — `eslint.config.js` lazy-imports this file at the very end',
    ' * of its rule list, so this file does NOT exist for `--ui custom`.',
    ' *',
    ' * Regenerate by re-running `npx create-eikon-react` with the same',
    ` * \`--ui ${ui}\` flag, or by editing this file in place if you want`,
    ' * to tighten the lint surface.',
    ' */',
    '',
    'export default [',
    '  {',
    '    files: [',
    `${filesLiteral},`,
    '    ],',
    '    rules: {',
    `${rulesLiteral},`,
    '    },',
    '  },',
    '];',
    '',
  ].join('\n');
}

export async function writeUiSnapshotEslintOverride(
  projectDir: string,
  ui: UiVariant,
  snapshotDir: string
): Promise<void> {
  if (ui === 'custom') return;
  const text = await buildUiSnapshotEslintConfig(ui, snapshotDir);
  if (!text) return;
  await writeFile(path.join(projectDir, UI_SNAPSHOT_ESLINT_FILE), text, 'utf8');
}
