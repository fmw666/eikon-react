import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import CodeMirror, { type Extension } from '@uiw/react-codemirror';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { type ParamsStore } from '@/lib/params-store';

import { useShellStore, useUiStore } from './store';
import { useScrollFade } from './useScrollFade';

interface FileResponse {
  path: string;
  size: number;
  text: string;
}

/**
 * 6-tuple of params accepted by `/api/file-content` (Phase F's
 * cache-decoupled endpoint). The simulator strips the file in memory
 * for the given inputs and returns the post-strip text — no viteBuild
 * involved, so flipping a runtime axis (design / ui / layout /
 * toastPosition) refreshes the editor pane in milliseconds.
 */
interface SimInputs {
  platform: string;
  supabase: boolean;
  pm: string;
  design: string;
  ui: string;
  layout: string;
  toastPosition: string;
}

function selectSimInputs(s: ParamsStore): SimInputs {
  return {
    platform: String(s.state.platform),
    supabase: !!s.state.supabase,
    pm: String(s.state.pm),
    design: String(s.state.design),
    ui: String(s.state.ui),
    layout: String(s.state.layout),
    toastPosition: String(s.state.toastPosition),
  };
}

function buildSimQuery(inputs: SimInputs, path: string): string {
  const params = new URLSearchParams();
  params.set('platform', inputs.platform);
  params.set('supabase', String(inputs.supabase));
  params.set('pm', inputs.pm);
  params.set('design', inputs.design);
  params.set('ui', inputs.ui);
  params.set('layout', inputs.layout);
  params.set('toastPosition', inputs.toastPosition);
  params.set('path', path);
  return params.toString();
}

/**
 * Static, module-level so it isn't re-allocated every render. Identity
 * stability matters here: CodeMirror's React wrapper diffs config objects
 * to decide whether to re-create the editor state.
 */
const BASIC_SETUP = {
  lineNumbers: true,
  foldGutter: true,
  highlightActiveLine: false,
  highlightActiveLineGutter: false,
} as const;

/**
 * Load a CodeMirror language pack lazily, keyed by file extension.
 *
 * Importing all five packs eagerly used to add ~hundreds of KB to the
 * shell's initial JS bundle even though the editor panel is closed by
 * default. With dynamic import, opening a `.tsx` file only pays for the
 * JS pack (which then also serves all `.ts/.js/.jsx/.mjs/.cjs` siblings).
 *
 * Returns `null` for unrecognised extensions — CodeMirror renders those
 * as plain text, which is fine for .env / LICENSE / .gitignore etc.
 */
async function loadLanguageFor(
  filePath: string
): Promise<Extension | null> {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  switch (ext) {
    case '.ts': {
      const { javascript } = await import('@codemirror/lang-javascript');
      return javascript({ typescript: true, jsx: false });
    }
    case '.tsx': {
      const { javascript } = await import('@codemirror/lang-javascript');
      return javascript({ typescript: true, jsx: true });
    }
    case '.js':
    case '.mjs':
    case '.cjs': {
      const { javascript } = await import('@codemirror/lang-javascript');
      return javascript({ jsx: false });
    }
    case '.jsx': {
      const { javascript } = await import('@codemirror/lang-javascript');
      return javascript({ jsx: true });
    }
    case '.json': {
      const { json } = await import('@codemirror/lang-json');
      return json();
    }
    case '.css': {
      const { css } = await import('@codemirror/lang-css');
      return css();
    }
    case '.html': {
      const { html } = await import('@codemirror/lang-html');
      return html();
    }
    case '.md':
    case '.mdx': {
      const { markdown } = await import('@codemirror/lang-markdown');
      return markdown();
    }
    default:
      return null;
  }
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for browsers without clipboard API permission.
  }
}

export function CodeView() {
  const inputs = useShellStore(useShallow(selectSimInputs));
  const selectedFile = useUiStore((s) => s.selectedFile);
  const closeFile = useUiStore((s) => s.closeFile);
  const codeWrapRef = useRef<HTMLDivElement | null>(null);
  useScrollFade(codeWrapRef);

  const [file, setFile] = useState<FileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCopied, setJustCopied] = useState(false);
  const [languageExt, setLanguageExt] = useState<Extension | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setFile(null);
      setError(null);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    fetch(
      `/api/file-content?${buildSimQuery(inputs, selectedFile)}`,
      { signal: ctrl.signal }
    )
      .then(async (r) => {
        if (r.status === 404) {
          // The currently-open file no longer exists in this variant
          // (typically because the user just toggled off a param that
          // included it). Showing a stale error pane feels broken — the
          // user's mental model is "I closed that feature, so its files
          // should disappear too". Collapse the editor instead.
          return { kind: 'gone' as const };
        }
        if (!r.ok) {
          throw new Error(`Failed to load file (${r.status})`);
        }
        return {
          kind: 'ok' as const,
          file: (await r.json()) as FileResponse,
        };
      })
      .then((res) => {
        if (res.kind === 'gone') {
          closeFile();
          return;
        }
        setFile(res.file);
        setError(null);
      })
      .catch((e: unknown) => {
        if ((e as { name?: string }).name === 'AbortError') return;
        setFile(null);
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [inputs, selectedFile, closeFile]);

  // Language packs load on-demand; opening the editor pays for at most
  // one pack at a time instead of all five up-front.
  useEffect(() => {
    if (!selectedFile) {
      setLanguageExt(null);
      return;
    }
    let cancelled = false;
    void loadLanguageFor(selectedFile).then((ext) => {
      if (!cancelled) setLanguageExt(ext);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedFile]);

  const extensions = useMemo(
    () => (languageExt ? [languageExt] : []),
    [languageExt]
  );

  const headerName = selectedFile ?? '(no file open)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minWidth: 0,
        background: '#1e1e1e',
        color: '#d4d4d4',
        borderRight: '1px solid #2d2d30',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 10px',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: 12,
          borderBottom: '1px solid #2d2d30',
          background: '#252526',
        }}
      >
        <span
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: selectedFile ? '#d4d4d4' : '#6b7280',
          }}
          title={headerName}
        >
          {headerName}
        </span>
        <span style={{ display: 'flex', gap: 4 }}>
          {file && (
            <button
              type="button"
              onClick={() => {
                void copyToClipboard(file.text);
                setJustCopied(true);
                window.setTimeout(() => setJustCopied(false), 1200);
              }}
              style={{
                background: 'transparent',
                color: '#9ca3af',
                border: '1px solid #3a3a3a',
                borderRadius: 3,
                padding: '1px 6px',
                fontSize: 11,
                cursor: 'pointer',
              }}
              title="Copy file contents"
            >
              {justCopied ? 'copied' : 'copy'}
            </button>
          )}
          {selectedFile && (
            <button
              type="button"
              onClick={closeFile}
              style={{
                background: 'transparent',
                color: '#9ca3af',
                border: '1px solid #3a3a3a',
                borderRadius: 3,
                padding: '1px 6px',
                fontSize: 11,
                cursor: 'pointer',
              }}
              title="Close file"
            >
              ×
            </button>
          )}
        </span>
      </div>
      <div ref={codeWrapRef} className="eikon-scroll-code" style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {!selectedFile && (
          <div
            style={{
              padding: 24,
              fontSize: 12,
              color: '#6b7280',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Pick a file in the explorer to view its post-strip source.
          </div>
        )}
        {loading && (
          <div style={{ padding: 12, fontSize: 12, color: '#9ca3af' }}>
            Loading…
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
        {file && (
          <CodeMirror
            value={file.text}
            theme={vscodeDark}
            extensions={extensions}
            readOnly
            basicSetup={BASIC_SETUP}
            style={{ fontSize: 12, height: '100%' }}
          />
        )}
      </div>
    </div>
  );
}
