import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import CodeMirror, { type Extension } from '@uiw/react-codemirror';
import { useEffect, useMemo, useState } from 'react';

import { useUiStore } from './store';

interface FileResponse {
  hash: string;
  path: string;
  size: number;
  text: string;
}

/**
 * Pick a CodeMirror language extension based on the file extension. Falls
 * back to no extension (CodeMirror renders plain text) for unrecognised
 * formats, which is fine for .env, LICENSE, .gitignore etc.
 */
function languageFor(filePath: string): Extension | null {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  switch (ext) {
    case '.ts':
      return javascript({ typescript: true, jsx: false });
    case '.tsx':
      return javascript({ typescript: true, jsx: true });
    case '.js':
    case '.mjs':
    case '.cjs':
      return javascript({ jsx: false });
    case '.jsx':
      return javascript({ jsx: true });
    case '.json':
      return json();
    case '.css':
      return css();
    case '.html':
      return html();
    case '.md':
    case '.mdx':
      return markdown();
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
  const hash = useUiStore((s) => s.currentHash);
  const selectedFile = useUiStore((s) => s.selectedFile);
  const closeFile = useUiStore((s) => s.closeFile);

  const [file, setFile] = useState<FileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCopied, setJustCopied] = useState(false);

  useEffect(() => {
    if (!hash || !selectedFile) {
      setFile(null);
      setError(null);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    fetch(
      `/api/file?hash=${encodeURIComponent(hash)}&path=${encodeURIComponent(
        selectedFile
      )}`,
      { signal: ctrl.signal }
    )
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(
            r.status === 404
              ? 'File not present in this variant.'
              : `Failed to load file (${r.status})`
          );
        }
        return (await r.json()) as FileResponse;
      })
      .then((f) => {
        setFile(f);
        setError(null);
      })
      .catch((e: unknown) => {
        if ((e as { name?: string }).name === 'AbortError') return;
        setFile(null);
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [hash, selectedFile]);

  const extensions = useMemo(() => {
    if (!selectedFile) return [];
    const lang = languageFor(selectedFile);
    return lang ? [lang] : [];
  }, [selectedFile]);

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
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
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
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: false,
              highlightActiveLineGutter: false,
            }}
            style={{ fontSize: 12, height: '100%' }}
          />
        )}
      </div>
    </div>
  );
}
