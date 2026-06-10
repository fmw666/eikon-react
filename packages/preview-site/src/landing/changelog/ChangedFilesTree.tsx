/**
 * @file ChangedFilesTree.tsx
 * @description Sidebar tree of changed files for the changelog page —
 * the thin parent that owns sizing + open-state and composes the
 * extracted pieces.
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
 *
 *   `getFileIcon` / `getFolderIcon` ARE shared from `shell/fileIcons`
 *   because they're pure data and have no coupling.
 *
 * The internals live in siblings (re-export only the public component):
 *   - tree shaping  → {@link ./changed-files-tree.build}
 *   - row renderer  → {@link ./ChangedFileRow}
 *   - tokens/types  → {@link ./changed-files-tree.shared}
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tree, type NodeApi } from 'react-arborist';

import type { CompareFile } from '@/lib/github';

import { ancestorsOf, buildTree, countVisible } from './changed-files-tree.build';
import {
  COLOR_BG,
  COLOR_BORDER,
  COLOR_TEXT,
  COLOR_TEXT_MUTED,
  ROW_HEIGHT,
  type TreeNode,
} from './changed-files-tree.shared';
import { Row } from './ChangedFileRow';

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

  // We measure only the WIDTH from the container (react-arborist's
  // FixedSizeList wants a pixel value). HEIGHT is derived from the
  // visible-node count below, so the tree's rendered height matches
  // its actual content — no `flex-1`-stretching, no
  // ResizeObserver-induced layout loops. See `useEffect` below for
  // why we don't read `getBoundingClientRect()` and why we floor.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(240);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let raf = 0;
    const obs = new ResizeObserver((entries) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const entry = entries[0];
        if (!entry) return;
        // `contentRect` is the untransformed layout size — `getBoundingClientRect()`
        // would mix in the route-enter `scale(0.992)` transform and report
        // a temporarily-smaller width during the cross-fade. Floor to whole
        // pixels so sub-pixel jitter doesn't keep retriggering us.
        const w = Math.floor(entry.contentRect.width);
        setWidth((prev) => (prev === w ? prev : w));
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

  // Track the live "open" state for each folder so we can size the
  // tree's outer container to its visible content rather than relying
  // on the surrounding flex container to stretch it. react-arborist
  // already owns this state internally; the `onToggle` callback is
  // the public hook we use to mirror it here for sizing purposes.
  const [openState, setOpenState] = useState<Record<string, boolean>>(
    () => initialOpenState ?? {}
  );
  // Re-seed when the underlying tree shape changes (new compare result,
  // newly-selected file's ancestors need to be auto-opened). We merge
  // rather than replace so the user's manual toggles aren't blown away
  // every time the selection changes.
  useEffect(() => {
    if (!initialOpenState) return;
    setOpenState((prev) => ({ ...initialOpenState, ...prev }));
  }, [initialOpenState]);
  const handleToggle = useCallback((id: string) => {
    setOpenState((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const visibleCount = useMemo(
    () => countVisible(tree, openState),
    [tree, openState]
  );
  // Tree list area's height = exact pixels needed to render all
  // currently-visible rows + the trailing 4px paddingBottom we pass
  // to react-arborist. Capping at MAX_TREE_PX prevents enormous
  // diffs (thousands of files) from stretching the whole workspace
  // taller than the viewport; once we hit the cap, react-arborist's
  // virtualised list takes over scrolling inside its own outer div.
  const MAX_TREE_PX = 720;
  const treeListHeight = Math.min(
    visibleCount * ROW_HEIGHT + 4,
    MAX_TREE_PX
  );

  const totalFiles = files.length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        // No fixed `height: 100%` — height matches the visible
        // content (header + computed tree list area) so the whole
        // card hugs its diff and tree instead of leaving a dead
        // "empty black" strip below short diffs. When the diff side
        // is taller than the tree, the parent's default
        // `items-stretch` lets this element's background continue
        // down to match so the gutter line never looks truncated.
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
          flexShrink: 0,
        }}
      >
        <span>Changed files</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{totalFiles}</span>
      </div>
      <div
        ref={wrapRef}
        style={{
          height: treeListHeight,
          overflow: 'hidden',
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
            width={width}
            height={treeListHeight - 4}
            indent={0}
            rowHeight={ROW_HEIGHT}
            paddingTop={0}
            paddingBottom={4}
            disableDrag
            disableDrop
            disableEdit
            disableMultiSelection
            onActivate={handleActivate}
            onToggle={handleToggle}
          >
            {Row}
          </Tree>
        )}
      </div>
    </div>
  );
}
