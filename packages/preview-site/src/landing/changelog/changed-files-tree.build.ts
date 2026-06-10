/**
 * @file changed-files-tree.build.ts
 * @description Pure tree-shaping helpers for {@link ./ChangedFilesTree}.
 *
 * The source data is `CompareFile[]` (flat array of paths). We derive a
 * hierarchical tree by splitting on '/' so the user sees
 * `src › landing › changelog › DiffView.tsx` rather than a flat
 * alphabetical list — matches GitHub's "Files changed" pane and is
 * navigable for large diffs. Folders carry roll-up stats (sum of
 * additions / deletions of all descendant files).
 */

import type { CompareFile } from '@/lib/github';

import type { FileNodeMeta, TreeNode } from './changed-files-tree.shared';

export function buildTree(files: CompareFile[]): TreeNode[] {
  // The shape we accumulate into is a recursive map keyed by segment so
  // we can find/insert ancestors cheaply. Each map value carries its
  // own running totals which we tally on insert — single pass, O(N·D)
  // where D is max path depth.
  type DirNode = {
    id: string;
    name: string;
    type: 'dir';
    additions: number;
    deletions: number;
    children: Map<string, DirNode | FileNodeData>;
  };
  type FileNodeData = {
    id: string;
    name: string;
    type: 'file';
    additions: number;
    deletions: number;
    meta: FileNodeMeta;
  };
  const root: Map<string, DirNode | FileNodeData> = new Map();

  for (const f of files) {
    const segments = f.filename.split('/').filter(Boolean);
    if (segments.length === 0) continue;

    let cursor: Map<string, DirNode | FileNodeData> = root;
    let pathSoFar = '';

    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i]!;
      pathSoFar = pathSoFar ? `${pathSoFar}/${seg}` : seg;
      let dir = cursor.get(seg);
      if (!dir || dir.type !== 'dir') {
        dir = {
          id: pathSoFar,
          name: seg,
          type: 'dir',
          additions: 0,
          deletions: 0,
          children: new Map(),
        };
        cursor.set(seg, dir);
      }
      // Roll up counts so folder rows summarise their subtree.
      dir.additions += f.additions;
      dir.deletions += f.deletions;
      cursor = dir.children;
    }

    const fileName = segments[segments.length - 1]!;
    const fileNode: FileNodeData = {
      id: f.filename,
      name: fileName,
      type: 'file',
      additions: f.additions,
      deletions: f.deletions,
      meta: {
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        fullPath: f.filename,
      },
    };
    cursor.set(fileName, fileNode);
  }

  return mapToArray(root);
}

function mapToArray(
  m: Map<string, { type: 'dir' | 'file' } & Record<string, unknown>>
): TreeNode[] {
  const out: TreeNode[] = [];
  for (const [, v] of m) {
    if (v.type === 'dir') {
      const dir = v as unknown as {
        id: string;
        name: string;
        additions: number;
        deletions: number;
        children: Map<string, { type: 'dir' | 'file' } & Record<string, unknown>>;
      };
      out.push({
        id: dir.id,
        name: dir.name,
        type: 'dir',
        additions: dir.additions,
        deletions: dir.deletions,
        children: mapToArray(dir.children),
      });
    } else {
      const file = v as unknown as {
        id: string;
        name: string;
        additions: number;
        deletions: number;
        meta: FileNodeMeta;
      };
      out.push({
        id: file.id,
        name: file.name,
        type: 'file',
        additions: file.additions,
        deletions: file.deletions,
        meta: file.meta,
      });
    }
  }
  // Folders before files within each level; alphabetical inside.
  out.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  // Depth-first sort children too.
  for (const n of out) {
    if (n.type === 'dir' && n.children) {
      n.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }
  }
  return out;
}

/**
 * Count how many rows react-arborist would actually render given the
 * current open/closed state of each folder. Files and collapsed
 * folders count as 1 row each; expanded folders contribute their own
 * row plus their visible children recursively. We use this to size
 * the tree's outer container to its real content height rather than
 * stretching it to fill the workspace card.
 */
export function countVisible(
  nodes: TreeNode[],
  openState: Record<string, boolean>
): number {
  let n = 0;
  for (const node of nodes) {
    n++;
    if (node.type === 'dir' && openState[node.id] && node.children) {
      n += countVisible(node.children, openState);
    }
  }
  return n;
}

/**
 * Path-traversal: returns folder ids leading to `targetId`. Mirrors
 * `FileExplorer`'s `ancestorsOf`; copied locally to keep the changelog
 * surface drop-in without importing playground internals.
 */
export function ancestorsOf(tree: TreeNode[], targetId: string): string[] {
  const out: string[] = [];
  function walk(nodes: TreeNode[], trail: string[]): boolean {
    for (const n of nodes) {
      if (n.id === targetId) {
        out.push(...trail);
        return true;
      }
      if (n.children && walk(n.children, [...trail, n.id])) return true;
    }
    return false;
  }
  walk(tree, []);
  return out;
}
