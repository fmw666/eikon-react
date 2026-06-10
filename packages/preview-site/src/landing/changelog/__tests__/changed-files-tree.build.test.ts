/**
 * @file changed-files-tree.build.test.ts
 * @description Unit tests for the pure tree-shaping logic extracted from
 * `ChangedFilesTree.tsx` — hierarchy building, folder roll-up stats,
 * dirs-before-files ordering, visible-row counting, and ancestor trails.
 * These functions have no React/DOM coupling, so they're tested directly.
 */

import { describe, expect, it } from 'vitest';

import type { CompareFile, FileChangeStatus } from '@/lib/github';

import {
  ancestorsOf,
  buildTree,
  countVisible,
} from '../changed-files-tree.build';

const file = (
  filename: string,
  additions = 1,
  deletions = 0,
  status: FileChangeStatus = 'modified'
): CompareFile => ({
  filename,
  status,
  additions,
  deletions,
  changes: additions + deletions,
});

describe('changed-files-tree build', () => {
  it('builds a nested tree, rolls up folder stats, and orders dirs before files', () => {
    const tree = buildTree([
      file('src/a/x.ts', 5, 1),
      file('src/a/y.ts', 3, 2),
      file('src/b.ts', 1, 0),
      file('README.md', 0, 0, 'added'),
    ]);

    // Top level: 'src' (dir) before 'README.md' (file).
    expect(tree.map((n) => n.id)).toEqual(['src', 'README.md']);

    const src = tree.find((n) => n.id === 'src')!;
    expect(src.type).toBe('dir');
    // Roll-up = sum of all descendant files: adds 5+3+1=9, dels 1+2+0=3.
    expect(src.additions).toBe(9);
    expect(src.deletions).toBe(3);
    // src children: 'a' (dir) before 'b.ts' (file).
    expect(src.children?.map((n) => n.name)).toEqual(['a', 'b.ts']);

    const a = src.children!.find((n) => n.name === 'a')!;
    expect(a.id).toBe('src/a');
    expect(a.additions).toBe(8);
    expect(a.deletions).toBe(3);
    expect(a.children?.map((n) => n.name)).toEqual(['x.ts', 'y.ts']);

    const x = a.children!.find((n) => n.name === 'x.ts')!;
    expect(x.type).toBe('file');
    expect(x.meta?.fullPath).toBe('src/a/x.ts');
    expect(x.meta?.status).toBe('modified');
  });

  it('countVisible respects each folder open/closed state', () => {
    const tree = buildTree([
      file('src/a/x.ts'),
      file('src/a/y.ts'),
      file('top.ts'),
    ]);
    // All collapsed: only the two top-level rows (src, top.ts).
    expect(countVisible(tree, {})).toBe(2);
    // Open src → src + a (collapsed) + top.ts = 3.
    expect(countVisible(tree, { src: true })).toBe(3);
    // Open src and src/a → src + a + x.ts + y.ts + top.ts = 5.
    expect(countVisible(tree, { src: true, 'src/a': true })).toBe(5);
  });

  it('ancestorsOf returns the folder trail to a node (empty for misses)', () => {
    const tree = buildTree([file('src/a/x.ts'), file('src/b.ts')]);
    expect(ancestorsOf(tree, 'src/a/x.ts')).toEqual(['src', 'src/a']);
    expect(ancestorsOf(tree, 'src/b.ts')).toEqual(['src']);
    expect(ancestorsOf(tree, 'does/not/exist')).toEqual([]);
  });

  it('handles an empty changeset', () => {
    expect(buildTree([])).toEqual([]);
    expect(countVisible([], {})).toBe(0);
  });
});
