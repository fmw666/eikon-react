import { lazy, Suspense, type CSSProperties, type ReactElement } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';

import { CommandBar } from './CommandBar';
import { FileExplorer } from './FileExplorer';
import { ParamsPanel } from './ParamsPanel';
import { PreviewFrame } from './PreviewFrame';
import { computeOverlayMode, UrlSync, useShellStore, useUiStore } from './store';
import { Toolbar } from './Toolbar';

// CodeView pulls in CodeMirror + a language pack (lazy-loaded inside the
// component itself). The editor panel is closed by default, so deferring
// the whole module via React.lazy keeps the cold bundle smaller.
const CodeView = lazy(() =>
  import('./CodeView').then((m) => ({ default: m.CodeView }))
);

/**
 * Three-pane layout, all but the preview optional:
 *
 *   [ FileExplorer ] [ CodeView ] [ PreviewFrame ]
 *
 * Toggle either side panel from the Toolbar. The preview always takes the
 * remaining space, including the full width when both side panels are
 * collapsed (zero-overhead common case).
 */
export default function App() {
  const showFiles = useUiStore((s) => s.showFiles);
  const showEditor = useUiStore((s) => s.showEditor);
  const buildStatus = useUiStore((s) => s.buildStatus);
  const buildError = useUiStore((s) => s.buildError);
  const currentHash = useUiStore((s) => s.currentHash);
  const treeReadyHash = useUiStore((s) => s.treeReadyHash);
  const iframeReadyHash = useUiStore((s) => s.iframeReadyHash);
  const platform = useShellStore((s) => String(s.state.platform));

  // Bucket the Group id by which panels are visible so toggling Files /
  // Editor doesn't surprise-resize the preview to whatever the prior
  // layout's split was. (Persistence is intentionally NOT enabled — sizes
  // reset to the defaults below each session, which is what we want while
  // we still iterate on those defaults.)
  const groupId = `eikon-${showFiles ? 'f' : ''}${showEditor ? 'e' : ''}p`;

  // Unified loading gate. The overlay covers the whole `<main>` (Files +
  // Editor + Preview) from the moment the user picks a param until every
  // visible panel has actually rendered the new build, so the user
  // doesn't see a half-updated UI (fresh iframe + stale tree, or vice
  // versa). The decision lives in `computeOverlayMode` (pure / tested);
  // App.tsx just plugs in the live store values.
  const overlayMode = computeOverlayMode({
    buildStatus,
    currentHash,
    iframeReadyHash,
    treeReadyHash,
    showFiles,
  });
  const isError = buildStatus === 'error';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '100vh',
        background: '#1e1e1e',
      }}
    >
      {/*
        UrlSync is the ONLY component that subscribes to the full param
        state. Keeping it as a sibling leaf (returns null) means the rest
        of the shell (Toolbar, FileExplorer, CodeView, …) is not forced
        to re-render every time the user toggles a checkbox.
      */}
      <UrlSync />
      <header
        style={{
          borderBottom: '1px solid #2d2d30',
          padding: 8,
          background: '#252526',
          color: '#d4d4d4',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <strong>Eikon Template Playground</strong>
        <ParamsPanel />
      </header>

      <Toolbar />

      <main
        style={{
          flex: 1,
          display: 'flex',
          minHeight: 0,
          // `position: relative` so the unified overlay below can pin
          // itself to the main content area (above Files + Editor +
          // Preview, below the toolbar / params header).
          position: 'relative',
        }}
      >
        <Group
          id={groupId}
          orientation="horizontal"
          style={{ flex: 1, width: '100%', height: '100%' }}
        >
          {/*
            Sizes are passed as STRING percentages on purpose. In v4 of
            react-resizable-panels, bare numeric values are interpreted as
            pixels (`defaultSize={18}` = 18px, which crushes the tree to a
            sliver). Strings ending in `%` always mean percentage of the
            parent Group, which is what we want here.
          */}
          {showFiles && (
            <>
              <Panel
                id="files"
                defaultSize="18%"
                minSize="12%"
                maxSize="40%"
              >
                <FileExplorer />
              </Panel>
              <Separator style={separatorStyle} />
            </>
          )}

          {showEditor && (
            <>
              <Panel
                id="editor"
                defaultSize={showFiles ? '35%' : '45%'}
                minSize="20%"
              >
                <Suspense fallback={<EditorFallback />}>
                  <CodeView />
                </Suspense>
              </Panel>
              <Separator style={separatorStyle} />
            </>
          )}

          <Panel id="preview" minSize="25%">
            <PreviewFrame />
          </Panel>
        </Group>

        {overlayMode && (
          <PlaygroundLoadingOverlay
            mode={overlayMode}
            platform={platform}
          />
        )}
        {isError && buildError && (
          <PlaygroundErrorOverlay error={buildError} />
        )}
      </main>

      <footer
        style={{
          borderTop: '1px solid #2d2d30',
          background: '#252526',
          color: '#d4d4d4',
        }}
      >
        <CommandBar />
      </footer>
    </div>
  );
}

const separatorStyle: CSSProperties = {
  width: 4,
  background: '#2d2d30',
  cursor: 'col-resize',
};

function EditorFallback() {
  return (
    <div
      style={{
        height: '100%',
        background: '#1e1e1e',
        color: '#6b7280',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 12,
        padding: 12,
      }}
    >
      Loading editor…
    </div>
  );
}

/**
 * Single loading overlay covering the entire main content area (Files +
 * Editor + Preview). Replaces the previous iframe-only "Building variant…"
 * pane so that a slow file-tree refetch or a still-loading iframe doesn't
 * leak through and create a half-updated impression while the build is
 * "ready" but panels haven't caught up yet.
 *
 *   - `mode='cold'`   first build of the session — there's no prior
 *                     content underneath, so we use a soft light wash
 *                     instead of a heavy dim.
 *   - `mode='rebuild'` switching variants — the prior iframe / tree are
 *                     still mounted underneath; we dim them so the
 *                     spinner reads as "the app is working" and the
 *                     dimmed content reads as "this is the previous
 *                     state, not the new one yet".
 *
 * `pointerEvents: 'none'` so the user can still resize panels mid-build
 * (a common gesture — they nudge the layout while waiting).
 */
function PlaygroundLoadingOverlay({
  mode,
  platform,
}: {
  mode: 'cold' | 'rebuild';
  platform: string;
}): ReactElement {
  const isRebuild = mode === 'rebuild';
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isRebuild ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.04)',
        color: isRebuild ? '#fff' : '#374151',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
        pointerEvents: 'none',
        backdropFilter: isRebuild ? 'blur(2px)' : 'none',
        transition: 'background 120ms ease',
        zIndex: 10,
      }}
      aria-live="polite"
      aria-busy="true"
    >
      <div style={{ textAlign: 'center', lineHeight: 1.5 }}>
        <Spinner inverted={isRebuild} />
        <div style={{ fontWeight: 600, marginTop: 10 }}>
          {isRebuild ? 'Rebuilding variant…' : 'Building variant…'}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            opacity: 0.85,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          platform={platform}
        </div>
        {!isRebuild && (
          <div style={{ marginTop: 6, fontSize: 11, opacity: 0.7 }}>
            first build of this combo takes a few seconds
          </div>
        )}
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            opacity: 0.65,
            maxWidth: 360,
          }}
        >
          The file tree, editor, and preview iframe all repaint together
          when the build is ready.
        </div>
      </div>
    </div>
  );
}

/**
 * Spinner sized to match the surrounding text. CSS-only so we don't pull
 * in any animation dependency. Inline keyframes via a `style` tag would
 * leak into every render; instead we lean on a Web Animations API call
 * indirectly by using `animation` shorthand against a globally-defined
 * keyframe in `index.css` (added below).
 */
function Spinner({ inverted }: { inverted: boolean }): ReactElement {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: `2px solid ${
          inverted ? 'rgba(255,255,255,0.25)' : 'rgba(55,65,81,0.18)'
        }`,
        borderTopColor: inverted ? '#fff' : '#374151',
        animation: 'eikon-preview-spin 0.8s linear infinite',
      }}
    />
  );
}

/**
 * Build-error overlay. Pinned to the same area as the loading overlay
 * (covers main) because a build failure is a project-wide event, not a
 * preview-pane-only issue — the file tree and editor will be empty or
 * stale until the user fixes the variant.
 */
function PlaygroundErrorOverlay({ error }: { error: string }): ReactElement {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        padding: 16,
        background: '#fff0f0',
        color: '#7f1d1d',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        zIndex: 11,
      }}
      role="alert"
    >
      <div style={{ marginBottom: 8, fontWeight: 600 }}>
        Build failed for the current variant
      </div>
      {error}
    </div>
  );
}
