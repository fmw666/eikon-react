/**
 * @file file-tree.ts
 * @description File-tree building for the playground's Files panel. Converts
 * the flat POSIX path list that `simulate-strip.ts` produces into the nested
 * `FileNode[]` shape the shell-side tree renderer consumes. Pure — no fs, no
 * request state — so it's directly unit-testable and shared by the
 * `/api/files-tree` handler.
 */

export interface FileNode {
  /** Path-from-template-root used as a stable id; e.g. 'src/app/providers.tsx'. */
  id: string;
  name: string;
  type: 'dir' | 'file';
  children?: FileNode[];
}

/**
 * Convert a flat list of POSIX-relative paths into the nested
 * `FileNode[]` shape the existing shell-side tree renderer expects.
 * Sorted dirs-before-files, case-insensitive — matches `readTree`.
 */
export function pathsToTree(paths: ReadonlyArray<string>): FileNode[] {
  interface DirAcc {
    children: Map<string, DirAcc | true>;
  }
  const root: DirAcc = { children: new Map() };
  for (const p of paths) {
    const parts = p.split('/');
    let cur: DirAcc = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]!;
      const isLeaf = i === parts.length - 1;
      const existing = cur.children.get(name);
      if (isLeaf) {
        if (existing === undefined) cur.children.set(name, true);
        // If a dir exists with the same name, that's a paths bug —
        // skip silently; the structure tests would catch it.
      } else {
        if (existing === true) {
          // Same name appeared once as file, now as dir — ignore the
          // file leaf. Shouldn't happen for real templates.
          const dir: DirAcc = { children: new Map() };
          cur.children.set(name, dir);
          cur = dir;
        } else if (existing === undefined) {
          const dir: DirAcc = { children: new Map() };
          cur.children.set(name, dir);
          cur = dir;
        } else {
          cur = existing;
        }
      }
    }
  }
  function emit(acc: DirAcc, prefix: string): FileNode[] {
    const dirs: FileNode[] = [];
    const files: FileNode[] = [];
    for (const [name, val] of acc.children) {
      const id = prefix ? `${prefix}/${name}` : name;
      if (val === true) {
        files.push({ id, name, type: 'file' });
      } else {
        dirs.push({ id, name, type: 'dir', children: emit(val, id) });
      }
    }
    const cmp = (a: FileNode, b: FileNode) =>
      a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
    return [...dirs.sort(cmp), ...files.sort(cmp)];
  }
  return emit(root, '');
}
