import { Icon } from '@iconify/react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tree, type NodeApi, type NodeRendererProps } from 'react-arborist';

import { getFileIcon, getFolderIcon } from './fileIcons';
import { useUiStore } from './store';

interface FileNode {
  id: string;
  name: string;
  type: 'dir' | 'file';
  children?: FileNode[];
}

interface FilesResponse {
  hash: string;
  tree: FileNode[];
}

function fetchTree(hash: string, signal: AbortSignal): Promise<FilesResponse> {
  return fetch(`/api/files?hash=${encodeURIComponent(hash)}`, { signal }).then(
    (r) => {
      if (!r.ok) throw new Error(`/api/files failed: ${r.status}`);
      return r.json() as Promise<FilesResponse>;
    }
  );
}

/**
 * Path-traversal of the tree: returns an array of *folder* ids leading to
 * `targetId`. Used to auto-expand to the currently-open file when the tree
 * (re-)loads after a variant switch.
 */
function ancestorsOf(tree: FileNode[], targetId: string): string[] {
  const out: string[] = [];
  function walk(nodes: FileNode[], trail: string[]): boolean {
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

/* ------------------------------------------------------------------------- */
/* Visual tokens — kept inline (not in a CSS file) so the component stays    */
/* drop-in and theme-aware without bringing Tailwind into Shell territory.   */
/* ------------------------------------------------------------------------- */
const COLOR_BG = '#1e1e1e';
const COLOR_BG_HOVER = 'rgba(255, 255, 255, 0.06)';
const COLOR_BG_SELECTED = '#094771';
const COLOR_TEXT = '#cccccc';
const COLOR_TEXT_MUTED = '#9ca3af';
const COLOR_BORDER = '#2d2d30';
const COLOR_GUIDE = '#2a2d2e';

const ROW_HEIGHT = 22;
const INDENT = 12;

function Chevron({ open }: { open: boolean }) {
  // Tiny inline SVG so the chevron is crisp on HiDPI and zero-deps. We rotate
  // the same path 90° instead of drawing a second one.
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

/**
 * Row is wrapped in `memo` because react-arborist re-renders the whole
 * row list on every tree-level state change (selection move, expand,
 * resize). Without memo, scrolling a moderately-sized tree (~200 nodes)
 * re-allocates ~200 indent-guide spans + ~200 SVG sub-trees per frame.
 */
const Row = memo(function Row({
  node,
  style,
  dragHandle,
}: NodeRendererProps<FileNode>) {
  const [hover, setHover] = useState(false);
  const isFolder = node.data.type === 'dir';
  const iconName = isFolder
    ? getFolderIcon(node.data.name, node.isOpen)
    : getFileIcon(node.data.name);

  // react-arborist places each row absolutely via `style.top`; we ADD our
  // own left padding for the row affordance (chevron / icon) but keep the
  // absolute positioning intact.
  const bg = node.isSelected
    ? COLOR_BG_SELECTED
    : hover
      ? COLOR_BG_HOVER
      : 'transparent';

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
      {/* Indent guides: a thin vertical line per ancestor level. */}
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

      {/* Chevron slot — folders get a real chevron, files get an empty
          spacer of identical width so the icon column stays aligned. */}
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
        }}
      >
        {node.data.name}
      </span>
    </div>
  );
});

export function FileExplorer() {
  const hash = useUiStore((s) => s.currentHash);
  const selectedFile = useUiStore((s) => s.selectedFile);
  const openFile = useUiStore((s) => s.openFile);

  const [tree, setTree] = useState<FileNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({
    w: 240,
    h: 400,
  });

  useEffect(() => {
    if (!hash) {
      setTree(null);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    fetchTree(hash, ctrl.signal)
      .then((r) => {
        setTree(r.tree);
        setError(null);
      })
      .catch((e: unknown) => {
        if ((e as { name?: string }).name === 'AbortError') return;
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => ctrl.abort();
  }, [hash]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // Coalesce ResizeObserver bursts (dragging the panel separator can
    // fire 60+ events/s) into one rAF-bounded setState. react-arborist
    // re-virtualises the whole list on width/height change, so this is
    // worth the few lines.
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
    (n: NodeApi<FileNode>) => {
      if (n.data.type === 'file') openFile(n.data.id);
    },
    [openFile]
  );

  const initialOpenState = useMemo(() => {
    if (!tree || !selectedFile) return undefined;
    const ancestors = ancestorsOf(tree, selectedFile);
    const map: Record<string, boolean> = {};
    for (const id of ancestors) map[id] = true;
    return map;
  }, [tree, selectedFile]);

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
        }}
      >
        Explorer
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
        {!hash && (
          <div
            style={{
              padding: 12,
              fontSize: 12,
              color: COLOR_TEXT_MUTED,
            }}
          >
            Waiting for first build…
          </div>
        )}
        {error && (
          <div
            style={{
              padding: 12,
              fontSize: 12,
              color: '#fca5a5',
              whiteSpace: 'pre-wrap',
            }}
          >
            {error}
          </div>
        )}
        {tree && (
          <Tree<FileNode>
            data={tree}
            openByDefault={false}
            initialOpenState={initialOpenState}
            selection={selectedFile ?? undefined}
            width={size.w}
            height={size.h}
            indent={0 /* we render our own indent in Row for guide lines */}
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
