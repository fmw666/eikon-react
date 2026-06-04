import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tree, type NodeApi } from 'react-arborist';
import { useShallow } from 'zustand/react/shallow';

import { Row } from './file-explorer/Row';
import { useIconsReady } from './file-explorer/icons';
import {
  ancestorsOf,
  fetchTree,
  selectSimInputs,
} from './file-explorer/sim-inputs';
import {
  COLOR_BG,
  COLOR_BORDER,
  COLOR_TEXT,
  COLOR_TEXT_MUTED,
  ROW_HEIGHT,
} from './file-explorer/tokens';
import { TreeSpinner } from './file-explorer/TreeSpinner';
import { type FileNode, type SimInputs } from './file-explorer/types';
import { useShellStore, useUiStore } from './store';
import { useScrollFade } from './useScrollFade';

export function FileExplorer() {
  const inputs = useShellStore(useShallow(selectSimInputs));
  const currentHash = useUiStore((s) => s.currentHash);
  const selectedFile = useUiStore((s) => s.selectedFile);
  const openFile = useUiStore((s) => s.openFile);
  const setTreeReadyHash = useUiStore((s) => s.setTreeReadyHash);

  const [tree, setTree] = useState<FileNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Track which `inputs` snapshot the currently-rendered `tree` was
  // fetched for. Identity comparison works because `useShallow` keeps
  // the `inputs` reference stable until its contents change.
  const [resolvedInputs, setResolvedInputs] = useState<SimInputs | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useScrollFade(wrapRef);
  const [size, setSize] = useState<{ w: number; h: number }>({
    w: 240,
    h: 400,
  });

  // Fetch on every input change. The new endpoint is decoupled from
  // the build cache: it walks `template-react/` through the simulator
  // and returns whatever `npx create-eikon-react --<args>` would
  // produce — fast enough that there's no cold/warm distinction worth
  // gating on. Runtime-axis flips (design / ui / layout /
  // toastPosition) update the panel in milliseconds without touching
  // viteBuild, so the user sees the file tree change in lock-step
  // with the iframe.
  useEffect(() => {
    const ctrl = new AbortController();
    fetchTree(inputs, ctrl.signal)
      .then((r) => {
        setTree(r.tree);
        setResolvedInputs(inputs);
        setError(null);
      })
      .catch((e: unknown) => {
        if ((e as { name?: string }).name === 'AbortError') return;
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => ctrl.abort();
  }, [inputs]);

  // Sync `treeReadyHash` to `currentHash` whenever the rendered tree IS
  // for the current inputs. This handles two cases at once:
  //   1) tree fetch resolves first → tree settles for inputs, currentHash
  //      not yet known (or just settled) — fire as soon as both align.
  //   2) build resolves first (cached) → currentHash advances, tree fetch
  //      still in flight (resolvedInputs !== inputs) so this is a no-op
  //      until the new tree lands; then it fires.
  // Without this, a fast tree fetch resolving before /api/build POST
  // would lock in the OLD currentHash and leave the overlay stuck on
  // every ui-axis flip.
  useEffect(() => {
    if (resolvedInputs === inputs && currentHash) {
      setTreeReadyHash(currentHash);
    }
  }, [currentHash, resolvedInputs, inputs, setTreeReadyHash]);

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

  // Pass `selection` only on initial tree load so react-arborist
  // highlights the previously-opened file. Once the user interacts,
  // internal selection state (driven by Row's `node.select()`) takes
  // over. We snapshot the selected file at tree-load time to avoid
  // react-arborist's useEffect re-firing scrollToItem on every
  // selection change — which fights with the layout shift when the
  // editor panel appears.
  const initialSelection = useRef<string | undefined>(undefined);
  const treeKey = tree; // identity-stable per fetch
  useMemo(() => {
    initialSelection.current = selectedFile ?? undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeKey]);

  const initialOpenState = useMemo(() => {
    if (!tree || !selectedFile) return undefined;
    const ancestors = ancestorsOf(tree, selectedFile);
    const map: Record<string, boolean> = {};
    for (const id of ancestors) map[id] = true;
    return map;
  }, [tree, selectedFile]);

  const iconsReady = useIconsReady(tree);

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
        className="eikon-scroll-panel"
        style={{
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
          paddingTop: 4,
        }}
      >
        {!tree && !error && (
          <div
            style={{
              padding: 12,
              fontSize: 12,
              color: COLOR_TEXT_MUTED,
            }}
          >
            Loading file tree…
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
        {tree && !iconsReady && <TreeSpinner />}
        {tree && iconsReady && (
          <div style={{ animation: 'eikon-fade-in 200ms ease both', height: '100%' }}>
            <Tree<FileNode>
              data={tree}
              openByDefault={false}
              initialOpenState={initialOpenState}
              selection={initialSelection.current}
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
          </div>
        )}
      </div>
    </div>
  );
}
