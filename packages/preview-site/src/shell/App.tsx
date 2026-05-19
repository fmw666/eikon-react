import { lazy, Suspense, type CSSProperties } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';

import { CommandBar } from './CommandBar';
import { FileExplorer } from './FileExplorer';
import { ParamsPanel } from './ParamsPanel';
import { PreviewFrame } from './PreviewFrame';
import { UrlSync, useUiStore } from './store';
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

  // Bucket the Group id by which panels are visible so toggling Files /
  // Editor doesn't surprise-resize the preview to whatever the prior
  // layout's split was. (Persistence is intentionally NOT enabled — sizes
  // reset to the defaults below each session, which is what we want while
  // we still iterate on those defaults.)
  const groupId = `eikon-${showFiles ? 'f' : ''}${showEditor ? 'e' : ''}p`;

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

      <main style={{ flex: 1, display: 'flex', minHeight: 0 }}>
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
