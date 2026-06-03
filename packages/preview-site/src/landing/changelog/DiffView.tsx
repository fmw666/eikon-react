/**
 * @file DiffView.tsx
 * @description Right-pane diff renderer. GitHub-style unified hunks,
 * VS Code dark palette to match `shell/CodeView.tsx`.
 *
 * REUSE NOTES
 *
 *   - Visual chrome (top header bar with filename + actions) mirrors
 *     `shell/CodeView.tsx`'s header so the changelog feels like the
 *     same product as the playground.
 *   - The body uses a custom DOM-based hunk renderer rather than
 *     CodeMirror — diff lines need per-row backgrounds for additions
 *     vs deletions, and CodeMirror's syntax-aware editor is overkill
 *     for read-only patch text where every line is already coloured
 *     by hunk role rather than by syntax. Custom DOM also lets us
 *     paint line-number gutters identically to GitHub at zero
 *     dependency cost.
 *
 * RENDER MODEL
 *
 *   For each hunk:
 *
 *     ┌─ "@@ -10,5 +12,7 @@ function foo()" ───── (gutter row, blue tint)
 *     │ 10 │ 12 │   unchanged context line
 *     │ 11 │    │ - removed line          (red tint)
 *     │    │ 13 │ + added line            (green tint)
 *     │    │ 14 │ + another added line    (green tint)
 *     │ 12 │ 15 │   another context line
 *
 *   Special cases:
 *
 *     - status === 'added'    → file didn't exist on the base side; we
 *                               render with a banner "Added in {head}",
 *                               followed by the patch (which will be
 *                               all `+` lines).
 *     - status === 'removed'  → "Removed in {head}", patch is all `−`.
 *     - status === 'renamed'  → header surfaces the previous filename.
 *     - patch === undefined   → likely binary or oversized. We surface
 *                               a friendly "no preview available" hint
 *                               with a link to the file on GitHub.
 *
 * SCROLLING
 *
 *   The wrapping div is `overflow:auto`. Lines are rendered as a
 *   `<table>` so the gutter columns stay sticky-aligned even when the
 *   content body has horizontal overflow (long lines on minified
 *   files). White-space is `pre` so we preserve indentation.
 */

import { useMemo, useState } from 'react';

import type { CompareFile } from '@/lib/github';

import { parsePatch, type DiffLine } from './diff-parser';

interface DiffViewProps {
  file: CompareFile | null;
  baseLabel: string | null;
  headLabel: string | null;
  /** Direct link to the file at the head ref on GitHub. */
  headBlobUrl?: string;
}

const COLOR_BG = '#1e1e1e';
const COLOR_TEXT = '#d4d4d4';
const COLOR_TEXT_MUTED = '#9ca3af';
const COLOR_BORDER = '#2d2d30';

// GitHub diff palette, reused (and dimmed) for our dark theme.
const COLOR_HUNK_BG = '#0d2b48'; // `@@` header strip
const COLOR_HUNK_TEXT = '#79c0ff';
const COLOR_ADD_BG = 'rgba(63, 185, 80, 0.18)';
const COLOR_ADD_FG = '#aff5b4';
const COLOR_ADD_GUTTER = 'rgba(63, 185, 80, 0.32)';
const COLOR_DEL_BG = 'rgba(248, 81, 73, 0.18)';
const COLOR_DEL_FG = '#ffdcd7';
const COLOR_DEL_GUTTER = 'rgba(248, 81, 73, 0.32)';

export function DiffView({
  file,
  baseLabel,
  headLabel,
  headBlobUrl,
}: DiffViewProps) {
  const hunks = useMemo(() => parsePatch(file?.patch), [file?.patch]);
  const [justCopied, setJustCopied] = useState(false);

  const headerName = file?.filename ?? '(no file selected)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        // Height is content-driven, not `100%`. Stretching to fill
        // the parent column was what produced the big "empty black"
        // strip under short diffs (a 270px diff inside a 560px
        // stretched workspace left ~260px of bare COLOR_BG below
        // the hunks). With auto height the diff card hugs its
        // hunks; the workspace section that wraps us is also
        // content-sized, so the page looks finished instead of
        // hollow when the diff is short.
        minWidth: 0,
        background: COLOR_BG,
        color: COLOR_TEXT,
      }}
    >
      {/* Top bar — matches the playground's CodeView header so the two
          surfaces read as the same shell. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '4px 10px',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: 12,
          borderBottom: `1px solid ${COLOR_BORDER}`,
          background: '#252526',
          minHeight: 28,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: file ? COLOR_TEXT : '#6b7280',
            }}
            title={headerName}
          >
            {headerName}
          </span>
          {file?.previousFilename && (
            <span
              style={{
                fontSize: 10,
                color: COLOR_TEXT_MUTED,
                whiteSpace: 'nowrap',
              }}
              title={`renamed from ${file.previousFilename}`}
            >
              ← {file.previousFilename}
            </span>
          )}
          {file && (
            <span
              style={{
                display: 'inline-flex',
                gap: 6,
                marginLeft: 4,
                fontSize: 11,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span style={{ color: COLOR_ADD_FG }}>+{file.additions}</span>
              <span style={{ color: COLOR_DEL_FG }}>−{file.deletions}</span>
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {file?.patch && (
            <button
              type="button"
              onClick={() => {
                if (!file?.patch) return;
                void navigator.clipboard.writeText(file.patch).catch(() => {
                  /* fallback no-op */
                });
                setJustCopied(true);
                window.setTimeout(() => setJustCopied(false), 1200);
              }}
              style={pillButtonStyle}
              title="Copy patch"
            >
              {justCopied ? 'copied' : 'copy patch'}
            </button>
          )}
          {headBlobUrl && (
            <a
              href={headBlobUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={pillLinkStyle}
              title="Open file on GitHub"
            >
              github
            </a>
          )}
        </div>
      </div>

      {/* Body */}
      <div
        className="eikon-changelog-diff-body eikon-scroll-panel"
        style={{
          // Fixed height — short diffs no longer leave whitespace
          // below the hunks, long diffs scroll internally past the
          // cap. 70vh keeps the body within the viewport on common
          // laptop displays; 720px caps it on tall monitors so the
          // diff doesn't grow into a strip taller than is comfortable
          // to scan in one glance.
          height: 'min(70vh, 720px)',
          overflow: 'auto',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: 12,
          lineHeight: '18px',
        }}
      >
        {!file ? (
          <Empty>Pick a file on the left to see its diff.</Empty>
        ) : !file.patch ? (
          <NoPreview file={file} headBlobUrl={headBlobUrl} />
        ) : (
          <DiffBody
            hunks={hunks}
            status={file.status}
            baseLabel={baseLabel}
            headLabel={headLabel}
          />
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// Body subcomponents
// ===========================================================================

function DiffBody({
  hunks,
  status,
  baseLabel,
  headLabel,
}: {
  hunks: ReturnType<typeof parsePatch>;
  status: CompareFile['status'];
  baseLabel: string | null;
  headLabel: string | null;
}) {
  return (
    <div>
      {/* Status banner above the hunks for "the whole file changed"
          cases. Matches GitHub's blue/green banners on added /
          removed file diffs. */}
      {status === 'added' && headLabel && (
        <Banner
          tone="add"
          text={`Added in ${headLabel}`}
        />
      )}
      {status === 'removed' && baseLabel && (
        <Banner
          tone="del"
          text={`Removed since ${baseLabel}`}
        />
      )}
      {status === 'renamed' && (
        <Banner
          tone="info"
          text="Renamed without content changes."
          when={hunks.length === 0}
        />
      )}

      {hunks.map((hunk, hi) => (
        <table
          key={hi}
          style={{
            width: 'max-content',
            minWidth: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'auto',
          }}
        >
          <colgroup>
            <col style={{ width: 50 }} />
            <col style={{ width: 50 }} />
            <col style={{ width: 14 }} />
            <col />
          </colgroup>
          <tbody>
            <tr>
              <td
                colSpan={4}
                style={{
                  background: COLOR_HUNK_BG,
                  color: COLOR_HUNK_TEXT,
                  padding: '2px 10px',
                  whiteSpace: 'pre',
                  fontVariantNumeric: 'tabular-nums',
                  borderTop:
                    hi > 0 ? `1px solid ${COLOR_BORDER}` : undefined,
                }}
              >
                {hunk.header}
              </td>
            </tr>
            {hunk.lines.map((line, li) => (
              <DiffRow key={li} line={line} />
            ))}
          </tbody>
        </table>
      ))}
      {hunks.length === 0 && status !== 'renamed' && (
        <Empty>No diff content.</Empty>
      )}
    </div>
  );
}

function DiffRow({ line }: { line: DiffLine }) {
  let bg: string | undefined;
  let fg: string = COLOR_TEXT;
  let gutterBg: string | undefined;
  let marker = ' ';

  if (line.type === 'add') {
    bg = COLOR_ADD_BG;
    fg = COLOR_ADD_FG;
    gutterBg = COLOR_ADD_GUTTER;
    marker = '+';
  } else if (line.type === 'del') {
    bg = COLOR_DEL_BG;
    fg = COLOR_DEL_FG;
    gutterBg = COLOR_DEL_GUTTER;
    marker = '−';
  } else if (line.type === 'meta') {
    fg = COLOR_TEXT_MUTED;
  }

  const gutterStyle: React.CSSProperties = {
    padding: '0 8px',
    textAlign: 'right',
    color: COLOR_TEXT_MUTED,
    background: gutterBg,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'pre',
    userSelect: 'none',
    width: 50,
    fontSize: 11,
    borderRight: '1px solid rgba(255, 255, 255, 0.04)',
  };

  return (
    <tr style={{ background: bg }}>
      <td style={gutterStyle}>{line.oldNumber ?? ''}</td>
      <td style={gutterStyle}>{line.newNumber ?? ''}</td>
      <td
        style={{
          padding: '0 4px',
          textAlign: 'center',
          color: fg,
          opacity: 0.7,
          userSelect: 'none',
          width: 14,
        }}
      >
        {marker}
      </td>
      <td
        style={{
          padding: '0 8px',
          color: fg,
          whiteSpace: 'pre',
        }}
      >
        {line.content || ' '}
      </td>
    </tr>
  );
}

function Banner({
  tone,
  text,
  when,
}: {
  tone: 'add' | 'del' | 'info';
  text: string;
  when?: boolean;
}) {
  if (when === false) return null;
  const palette =
    tone === 'add'
      ? { bg: COLOR_ADD_BG, fg: COLOR_ADD_FG }
      : tone === 'del'
        ? { bg: COLOR_DEL_BG, fg: COLOR_DEL_FG }
        : { bg: COLOR_HUNK_BG, fg: COLOR_HUNK_TEXT };
  return (
    <div
      style={{
        background: palette.bg,
        color: palette.fg,
        padding: '6px 12px',
        fontSize: 11,
        borderBottom: `1px solid ${COLOR_BORDER}`,
        fontFamily:
          '"Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
    >
      {text}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 24,
        fontSize: 12,
        color: COLOR_TEXT_MUTED,
        fontFamily:
          '"Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
    >
      {children}
    </div>
  );
}

function NoPreview({
  file,
  headBlobUrl,
}: {
  file: CompareFile;
  headBlobUrl: string | undefined;
}) {
  // GitHub omits `patch` for binaries (images, fonts, etc.) and for
  // textual diffs that exceed a per-file 1MB cap. We surface a
  // graceful "no preview available" pane instead of pretending there
  // were zero changes.
  return (
    <div
      style={{
        padding: 24,
        fontSize: 12,
        color: COLOR_TEXT_MUTED,
        fontFamily:
          '"Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div>
        No inline preview available for this file (binary or oversized).
      </div>
      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>
        {file.filename}
        <span style={{ marginLeft: 8 }}>
          status: <strong>{file.status}</strong>
        </span>
      </div>
      {headBlobUrl && (
        <a
          href={headBlobUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#79c0ff',
            textDecoration: 'underline',
            fontSize: 11,
          }}
        >
          Open on GitHub →
        </a>
      )}
    </div>
  );
}

// ===========================================================================
// Inline button styles (kept here so the file is drop-in)
// ===========================================================================

const pillButtonStyle: React.CSSProperties = {
  background: 'transparent',
  color: '#9ca3af',
  border: '1px solid #3a3a3a',
  borderRadius: 3,
  padding: '1px 6px',
  fontSize: 11,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const pillLinkStyle: React.CSSProperties = {
  ...pillButtonStyle,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
};
