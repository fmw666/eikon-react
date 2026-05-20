/**
 * @file ChangedFilesTree.tsx
 * @description Sidebar tree of changed files for the changelog page.
 *
 * REUSE NOTES
 *
 *   This component intentionally mirrors `shell/FileExplorer.tsx`'s
 *   visual language (VS Code dark, react-arborist, the same Chevron +
 *   indent guides + COLOR_* tokens). We did NOT extract a shared
 *   primitive because:
 *
 *     1. The two surfaces differ in DATA shape (build-output paths vs
 *        compare-API change rows) and in EXTRA chrome (this one shows
 *        a status badge + additions/deletions counter on every file
 *        row; the build-output tree shows neither).
 *     2. They differ in STORE coupling (`useUiStore` vs
 *        `useChangelogStore`); a shared component would need a config-
 *        prop sprawl to satisfy both.
 *     3. Both are small (~250 lines); duplicating the look + feel is
 *        cheaper than the abstraction tax.
 *
 *   `getFileIcon` / `getFolderIcon` ARE shared from `shell/fileIcons`
 *   because they're pure data and have no coupling.
 *
 * INPUT SHAPE
 *
 *   The source data is `CompareFile[]` (flat array of paths). We
 *   derive a hierarchical tree by splitting on '/' so the user sees
 *   `src › landing › changelog › DiffView.tsx` rather than a flat
 *   alphabetical list — matches GitHub's "Files changed" pane and is
 *   navigable for large diffs.
 *
 *   Folders carry roll-up stats (sum of additions / deletions of all
 *   descendant files) so glancing at a folder row tells you "this dir
 *   has +120 -30 across 4 files" without expanding it.
 */

import { Icon } from '@iconify/react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tree, type NodeApi, type NodeRendererProps } from 'react-arborist';

import { getFileIcon, getFolderIcon } from '@/shell/fileIcons';

import type { CompareFile, FileChangeStatus } from '@/lib/github';

// ---------------------------------------------------------------------------
// Visual tokens — kept in lock-step with shell/FileExplorer.tsx so the
// playground and changelog read as siblings. Status colours are taken
// from GitHub's diff palette so visitors with prior GitHub muscle
// memory recognise them instantly.
// ---------------------------------------------------------------------------

const COLOR_BG = '#1e1e1e';
const COLOR_BG_HOVER = 'rgba(255, 255, 255, 0.06)';
const COLOR_BG_SELECTED = '#094771';
const COLOR_TEXT = '#cccccc';
const COLOR_TEXT_MUTED = '#9ca3af';
const COLOR_BORDER = '#2d2d30';
const COLOR_GUIDE = '#2a2d2e';

const COLOR_ADD = '#3fb950';
const COLOR_DEL = '#f85149';
const COLOR_RENAME = '#a371f7';
const COLOR_MODIFIED = '#d29922';

const ROW_HEIGHT = 22;
const INDENT = 12;

// ---------------------------------------------------------------------------
// Tree types
// ---------------------------------------------------------------------------

interface FileNodeMeta {
  status: FileChangeStatus;
  additions: number;
  deletions: number;
  /** Full path (from repo root). Used as the file id + diff lookup key. */
  fullPath: string;
}

interface TreeNode {
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

// ---------------------------------------------------------------------------
// Building the tree from the flat compare result
// ---------------------------------------------------------------------------

function buildTree(files: CompareFile[]): TreeNode[] {
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
 * Path-traversal: returns folder ids leading to `targetId`. Mirrors
 * `FileExplorer`'s `ancestorsOf`; copied locally to keep the changelog
 * surface drop-in without importing playground internals.
 */
function ancestorsOf(tree: TreeNode[], targetId: string): string[] {
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

// ---------------------------------------------------------------------------
// Status badge — A / D / M / R / C, GitHub colour palette
// ---------------------------------------------------------------------------

const STATUS_LETTER: Record<FileChangeStatus, string> = {
  added: 'A',
  removed: 'D',
  modified: 'M',
  renamed: 'R',
  copied: 'C',
  changed: 'M',
  unchanged: '·',
};

const STATUS_COLOR: Record<FileChangeStatus, string> = {
  added: COLOR_ADD,
  removed: COLOR_DEL,
  modified: COLOR_MODIFIED,
  renamed: COLOR_RENAME,
  copied: COLOR_RENAME,
  changed: COLOR_MODIFIED,
  unchanged: COLOR_TEXT_MUTED,
};

function StatusBadge({ status }: { status: FileChangeStatus }) {
  return (
    <span
      title={status}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 14,
        height: 14,
        padding: '0 3px',
        borderRadius: 3,
        fontSize: 9,
        fontWeight: 700,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        color: STATUS_COLOR[status],
        background: `${STATUS_COLOR[status]}20`,
        border: `1px solid ${STATUS_COLOR[status]}40`,
        flexShrink: 0,
        lineHeight: '12px',
      }}
    >
      {STATUS_LETTER[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

const Row = memo(function Row({
  node,
  style,
  dragHandle,
}: NodeRendererProps<TreeNode>) {
  const [hover, setHover] = useState(false);
  const isFolder = node.data.type === 'dir';
  const iconName = isFolder
    ? getFolderIcon(node.data.name, node.isOpen)
    : getFileIcon(node.data.name);

  const bg = node.isSelected
    ? COLOR_BG_SELECTED
    : hover
      ? COLOR_BG_HOVER
      : 'transparent';

  const additions = node.data.additions;
  const deletions = node.data.deletions;

  return (
    <div
      ref={dragHandle}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        paddingLeft: 4,
        paddingRight: 6,
        cursor: 'pointer',
        userSelect: 'none',
        background: bg,
        color: COLOR_TEXT,
        fontSize: 13,
        fontFamily:
          '"Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        position: 'relative',
      }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onClick={() => {
        if (isFolder) {
          node.toggle();
        } else {
          node.select();
          node.activate();
        }
      }}
      title={node.id}
    >
      {Array.from({ length: node.level }).map((_, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: 4 + i * INDENT + INDENT / 2 - 0.5,
            top: 0,
            bottom: 0,
            width: 1,
            background: COLOR_GUIDE,
            pointerEvents: 'none',
          }}
        />
      ))}

      <span
        style={{
          width: 12,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginLeft: node.level * INDENT,
        }}
      >
        {isFolder ? <Chevron open={node.isOpen} /> : null}
      </span>

      <Icon
        icon={iconName}
        width={16}
        height={16}
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      />

      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
          minWidth: 0,
        }}
      >
        {node.data.name}
      </span>

      {/* Right-aligned cluster: additions, deletions, status badge. We
          paint additions GREEN and deletions RED so the row reads as a
          tiny GitHub diff stat at a glance. Folders show roll-up
          counts but no badge (the status is per-file). */}
      {(additions > 0 || deletions > 0) && (
        <span
          style={{
            display: 'inline-flex',
            gap: 4,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: 10,
            flexShrink: 0,
          }}
        >
          {additions > 0 && (
            <span style={{ color: COLOR_ADD }}>+{additions}</span>
          )}
          {deletions > 0 && (
            <span style={{ color: COLOR_DEL }}>−{deletions}</span>
          )}
        </span>
      )}

      {!isFolder && node.data.meta && (
        <StatusBadge status={node.data.meta.status} />
      )}
    </div>
  );
});

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 10 10"
      style={{
        flexShrink: 0,
        transform: open ? 'rotate(90deg)' : 'none',
        transition: 'transform 80ms ease',
        color: COLOR_TEXT_MUTED,
      }}
      aria-hidden="true"
    >
      <path
        d="M3 1.5 L7 5 L3 8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface ChangedFilesTreeProps {
  files: CompareFile[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}

export function ChangedFilesTree({
  files,
  selectedFile,
  onSelectFile,
}: ChangedFilesTreeProps) {
  const tree = useMemo(() => buildTree(files), [files]);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({
    w: 240,
    h: 400,
  });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let raf = 0;
    const obs = new ResizeObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const rect = el.getBoundingClientRect();
        setSize((prev) =>
          prev.w === rect.width && prev.h === rect.height
            ? prev
            : { w: rect.width, h: rect.height }
        );
      });
    });
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const handleActivate = useCallback(
    (n: NodeApi<TreeNode>) => {
      if (n.data.type === 'file') onSelectFile(n.data.id);
    },
    [onSelectFile]
  );

  const initialOpenState = useMemo(() => {
    if (!tree.length) return undefined;
    // Open every top-level folder by default — small diffs (most of
    // them) become fully visible at a glance; large diffs still
    // collapse on user click.
    const map: Record<string, boolean> = {};
    for (const n of tree) {
      if (n.type === 'dir') map[n.id] = true;
    }
    if (selectedFile) {
      for (const id of ancestorsOf(tree, selectedFile)) map[id] = true;
    }
    return map;
  }, [tree, selectedFile]);

  const totalFiles = files.length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: COLOR_BG,
        color: COLOR_TEXT,
        borderRight: `1px solid ${COLOR_BORDER}`,
        minWidth: 0,
      }}
    >
      <div
        style={{
          padding: '6px 12px',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          color: COLOR_TEXT_MUTED,
          borderBottom: `1px solid ${COLOR_BORDER}`,
          fontFamily:
            '"Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Changed files</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{totalFiles}</span>
      </div>
      <div
        ref={wrapRef}
        style={{
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
          paddingTop: 4,
        }}
      >
        {totalFiles === 0 ? (
          <div
            style={{
              padding: 12,
              fontSize: 12,
              color: COLOR_TEXT_MUTED,
            }}
          >
            No file differences in this range.
          </div>
        ) : (
          <Tree<TreeNode>
            data={tree}
            openByDefault={false}
            initialOpenState={initialOpenState}
            selection={selectedFile ?? undefined}
            width={size.w}
            height={size.h}
            indent={0}
            rowHeight={ROW_HEIGHT}
            paddingTop={0}
            paddingBottom={4}
            disableDrag
            disableDrop
            disableEdit
            disableMultiSelection
            onActivate={handleActivate}
          >
            {Row}
          </Tree>
        )}
      </div>
    </div>
  );
}
