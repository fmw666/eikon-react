import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';

import { FileExplorer } from './FileExplorer';
import { PreviewFrame } from './PreviewFrame';
import { computeOverlayMode, UrlSync, useShellStore, useUiStore } from './store';
import { Toolbar } from './Toolbar';

/**
 * The breakpoint at which the playground swaps from the desktop
 * three-pane resizable layout (Files | Code | Preview) to the
 * mobile tab-strip layout (one full-bleed view at a time). Picked
 * to match Tailwind's `md` breakpoint so the same threshold gates
 * the Toolbar's compact mode (see `Toolbar.tsx`).
 *
 * Why `md` (768) and not `lg` (1024)
 * ----------------------------------
 * The resizable three-pane layout becomes operable around 720-760px
 * — narrower than that and Files/Editor minimums (12% + 20% = 32% of
 * width = ~230px combined) leave the Preview with too little room.
 * Splitting at `md` gives a clear "tablet uses panels, phone uses
 * tabs" affordance.
 */
const SHELL_MEDIA_QUERY = '(min-width: 768px)';

function useIsCompactShell(): boolean {
  // Mirror `CollapsibleSidebar.useIsLargeViewport` — initialise
  // synchronously from `matchMedia` so the first paint commits to
  // the right variant (this is a Vite SPA, no SSR).
  const [isMd, setIsMd] = useState<boolean>(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return true;
    }
    return window.matchMedia(SHELL_MEDIA_QUERY).matches;
  });
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }
    const mq = window.matchMedia(SHELL_MEDIA_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMd(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return !isMd;
}

// CodeView pulls in CodeMirror + a language pack (lazy-loaded inside the
// component itself). The editor panel is closed by default, so deferring
// the whole module via React.lazy keeps the cold bundle smaller.
const CodeView = lazy(() =>
  import('./CodeView').then((m) => ({ default: m.CodeView }))
);

/**
 * Resizable three-pane workspace used by the landing page's playground
 * section. Was previously the whole App (top header, params row,
 * toolbar, three panes, command bar). Today only the three panes +
 * Toolbar + overlay live here — outer chrome (Nav, Hero, PlatformPicker,
 * ParamsPanel, PromptOutput, Footer) is owned by `landing/`.
 *
 *   ┌── Toolbar ──────────────────────────────────────────────────────┐
 *   ├──────────────┬──────────────────────────────────┬───────────────┤
 *   │              │                                  │               │
 *   │  Files       │  Code (lazy)                     │  Preview      │
 *   │              │                                  │               │
 *   └──────────────┴──────────────────────────────────┴───────────────┘
 *
 * The body of the section sits at a fixed height (controlled by the
 * landing wrapper) so the resizable panels have a known parent box.
 */
export function PlaygroundShell() {
  const showFiles = useUiStore((s) => s.showFiles);
  const showEditor = useUiStore((s) => s.showEditor);
  const buildStatus = useUiStore((s) => s.buildStatus);
  const buildError = useUiStore((s) => s.buildError);
  const currentHash = useUiStore((s) => s.currentHash);
  const treeReadyHash = useUiStore((s) => s.treeReadyHash);
  const iframeReadyHash = useUiStore((s) => s.iframeReadyHash);
  const platform = useShellStore((s) => String(s.state.platform));
  const isCompact = useIsCompactShell();

  const [mobileView, setMobileView] = useState<'preview' | 'files' | 'code'>(
    'preview'
  );

  const groupId = `eikon-${showFiles ? 'f' : ''}${showEditor ? 'e' : ''}p`;

  const overlayMode = computeOverlayMode({
    buildStatus,
    currentHash,
    iframeReadyHash,
    treeReadyHash,
    showFiles,
  });
  const isError = buildStatus === 'error';

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--border-1)] bg-[var(--surface-1)]">
      <UrlSync />

      <Toolbar
        compact={isCompact}
        mobileView={mobileView}
        onChangeMobileView={setMobileView}
      />

      <main className="relative flex min-h-0 flex-1">
        {isCompact ? (
          <div className="flex h-full w-full min-h-0 min-w-0 flex-col">
            {mobileView === 'preview' && <PreviewFrame />}
            {mobileView === 'files' && <FileExplorer />}
            {mobileView === 'code' && (
              <Suspense fallback={<EditorFallback />}>
                <CodeView />
              </Suspense>
            )}
          </div>
        ) : (
          <Group
            id={groupId}
            orientation="horizontal"
            style={{ flex: 1, width: '100%', height: '100%' }}
          >
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
                <Separator className="eikon-separator" style={separatorStyle} />
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
                <Separator className="eikon-separator" style={separatorStyle} />
              </>
            )}

            <Panel id="preview" minSize="25%">
              <PreviewFrame />
            </Panel>
          </Group>
        )}

        {overlayMode && (
          <PlaygroundLoadingOverlay mode={overlayMode} platform={platform} />
        )}
        {isError && buildError && (
          <PlaygroundErrorOverlay error={buildError} />
        )}
      </main>
    </div>
  );
}

/**
 * Backwards-compat default export. The vite entry used to render `<App />`;
 * `main.tsx` now mounts `<LandingPage />` directly, but we keep this
 * thin alias so external scripts / tests / a future "playground-only"
 * entry can still import the default.
 */
export default function App() {
  return <PlaygroundShell />;
}

const separatorStyle: CSSProperties = {
  width: 4,
  cursor: 'col-resize',
};

function EditorFallback() {
  return (
    <div className="h-full bg-[var(--surface-1)] p-3 text-xs text-[var(--fg-3)]">
      Loading editor…
    </div>
  );
}

/**
 * Single loading overlay covering the entire main content area (Files +
 * Editor + Preview).
 *
 *   - `mode='cold'`   first build of the session — there's no prior
 *                     content underneath, so we use a soft wash
 *                     instead of a heavy dim.
 *   - `mode='rebuild'` switching variants — the prior iframe / tree are
 *                     still mounted underneath; we dim them so the
 *                     spinner reads as "the app is working" and the
 *                     dimmed content reads as "this is the previous
 *                     state, not the new one yet".
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
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={
        'pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-colors duration-150 ' +
        (isRebuild
          ? 'bg-black/45 text-white backdrop-blur-[2px]'
          : 'bg-[color-mix(in_oklab,var(--surface-1)_70%,transparent)] text-[var(--fg-2)]')
      }
    >
      <div className="text-center leading-relaxed">
        <Spinner inverted={isRebuild} />
        <div className="mt-2.5 text-sm font-semibold">
          {isRebuild ? 'Rebuilding variant…' : 'Building variant…'}
        </div>
        <div className="mt-1 font-mono text-[11px] opacity-80">
          platform={platform}
        </div>
        {!isRebuild && (
          <div className="mt-1 text-[11px] opacity-70">
            first build of this combo takes a few seconds
          </div>
        )}
      </div>
    </div>
  );
}

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
          inverted ? 'rgba(255,255,255,0.25)' : 'rgba(148, 163, 184, 0.25)'
        }`,
        borderTopColor: inverted ? '#fff' : 'var(--fg-1)',
        animation: 'eikon-preview-spin 0.8s linear infinite',
      }}
    />
  );
}

/**
 * Build-error overlay. A failed build is a project-wide event, so we
 * cover the entire playground main area — file tree and editor will be
 * empty / stale until the user fixes the variant.
 */
function PlaygroundErrorOverlay({ error }: { error: string }): ReactElement {
  return (
    <div
      role="alert"
      className="absolute inset-0 z-[11] overflow-auto whitespace-pre-wrap bg-red-50 p-4 font-mono text-xs text-red-900 dark:bg-red-950/40 dark:text-red-300"
    >
      <div className="mb-2 font-semibold">
        Build failed for the current variant
      </div>
      {error}
    </div>
  );
}
