/**
 * @file changed-files-tree.shared.ts
 * @description Visual tokens + tree node types shared by the
 * {@link ./ChangedFilesTree} parent, its {@link ./ChangedFileRow}
 * renderer, and the {@link ./changed-files-tree.build} tree builder.
 *
 * Tokens are kept in lock-step with `shell/FileExplorer.tsx` so the
 * playground and changelog read as siblings. Status colours are taken
 * from GitHub's diff palette so visitors with prior GitHub muscle
 * memory recognise them instantly.
 */

import type { FileChangeStatus } from '@/lib/github';

export const COLOR_BG = '#1e1e1e';
export const COLOR_BG_HOVER = 'rgba(255, 255, 255, 0.06)';
export const COLOR_BG_SELECTED = '#094771';
export const COLOR_TEXT = '#cccccc';
export const COLOR_TEXT_MUTED = '#9ca3af';
export const COLOR_BORDER = '#2d2d30';
export const COLOR_GUIDE = '#2a2d2e';

export const COLOR_ADD = '#3fb950';
export const COLOR_DEL = '#f85149';
export const COLOR_RENAME = '#a371f7';
export const COLOR_MODIFIED = '#d29922';

export const ROW_HEIGHT = 22;
export const INDENT = 12;

export interface FileNodeMeta {
  status: FileChangeStatus;
  additions: number;
  deletions: number;
  /** Full path (from repo root). Used as the file id + diff lookup key. */
  fullPath: string;
}

export interface TreeNode {
  /** Stable id — for files this is the full path; for folders it's the
   *  full directory path. Both are unique within a single compare. */
  id: string;
  name: string;
  type: 'dir' | 'file';
  /** Aggregate counts: per-file (=its own) for files, sum-of-descendants for folders. */
  additions: number;
  deletions: number;
  /** File-only metadata. Folders leave it undefined. */
  meta?: FileNodeMeta;
  children?: TreeNode[];
}

// Status badge — A / D / M / R / C, GitHub colour palette.

export const STATUS_LETTER: Record<FileChangeStatus, string> = {
  added: 'A',
  removed: 'D',
  modified: 'M',
  renamed: 'R',
  copied: 'C',
  changed: 'M',
  unchanged: '·',
};

export const STATUS_COLOR: Record<FileChangeStatus, string> = {
  added: COLOR_ADD,
  removed: COLOR_DEL,
  modified: COLOR_MODIFIED,
  renamed: COLOR_RENAME,
  copied: COLOR_RENAME,
  changed: COLOR_MODIFIED,
  unchanged: COLOR_TEXT_MUTED,
};
