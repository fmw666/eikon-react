/**
 * @file diff-parser.ts
 * @description Unified-diff (patch) parser. Pure data, zero deps.
 *
 * GitHub's compare API returns the per-file diff as a single string of
 * unified-format hunks, e.g.
 *
 *   @@ -10,5 +12,7 @@ context-tail
 *    line that's unchanged
 *   -line that's deleted
 *   +line that's added
 *   +another added line
 *    another unchanged line
 *
 * This parser turns that string into structured hunks the renderer can
 * iterate over without inline regex churn.
 *
 * SHAPE
 *
 *   parsePatch(text) -> Hunk[]
 *
 *   Each Hunk has:
 *     - header  (raw `@@ ... @@` line, kept verbatim for the row gutter)
 *     - oldStart / oldLines  (left-side ranges, used to number deletions)
 *     - newStart / newLines  (right-side ranges, used to number additions)
 *     - lines   (DiffLine[] — context | add | del | meta)
 *
 *   `meta` lines carry "\ No newline at end of file" and similar markers
 *   that aren't part of the visible diff but matter for fidelity.
 *
 * CORNER CASES HANDLED
 *
 *   - `@@ -0,0 +1,N @@` (file added) — oldStart=0, oldLines=0.
 *   - `@@ -1,N +0,0 @@` (file removed) — newStart=0, newLines=0.
 *   - Hunk header with optional context tail (`... @@ function foo() {`).
 *   - Empty patch string → returns empty array (caller can detect and
 *     show "No preview available").
 *   - CRLF line endings — we split on \n and tolerate trailing \r.
 *
 * NOT HANDLED (out of scope for this surface)
 *
 *   - Multi-file patches in one string (GitHub compare API gives one
 *     patch per file already).
 *   - Conflict markers (no merge UI here).
 *   - Word/intra-line diff (GitHub itself doesn't render these by
 *     default in compare view).
 */

export type DiffLineType = 'context' | 'add' | 'del' | 'meta';

export interface DiffLine {
  type: DiffLineType;
  /** Raw text content, with the leading `+`/`-`/` ` marker stripped. */
  content: string;
  /** Line number on the LEFT (base) side, or null for `add`. */
  oldNumber: number | null;
  /** Line number on the RIGHT (head) side, or null for `del`. */
  newNumber: number | null;
}

export interface Hunk {
  /** Raw `@@ ... @@` header. Rendered verbatim above the hunk. */
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

const HUNK_RE = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/;

export function parsePatch(text: string | undefined | null): Hunk[] {
  if (!text) return [];

  const hunks: Hunk[] = [];
  let current: Hunk | null = null;
  let oldCursor = 0;
  let newCursor = 0;

  // Tolerate CRLF and stray trailing \r without an extra normalize() pass.
  const rawLines = text.split('\n');

  for (const rawLine of rawLines) {
    // Strip a single trailing \r so we don't render visible blanks.
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;

    const headerMatch = HUNK_RE.exec(line);
    if (headerMatch) {
      // GitHub-style hunk headers: `@@ -oldStart,oldLines +newStart,newLines @@ optional context`.
      // Counts default to 1 when omitted (single-line hunks: `@@ -3 +3 @@`).
      const oldStart = Number(headerMatch[1]);
      const oldLines = headerMatch[2] !== undefined ? Number(headerMatch[2]) : 1;
      const newStart = Number(headerMatch[3]);
      const newLines = headerMatch[4] !== undefined ? Number(headerMatch[4]) : 1;
      current = {
        header: line,
        oldStart,
        oldLines,
        newStart,
        newLines,
        lines: [],
      };
      hunks.push(current);
      // The cursors track which line number the NEXT non-header row
      // would have. They start one before the hunk's start so the first
      // appended line claims `oldStart` / `newStart` on increment.
      oldCursor = oldStart;
      newCursor = newStart;
      continue;
    }

    if (!current) {
      // Anything before the first `@@` is patch metadata (e.g. `--- a/foo`,
      // `+++ b/foo`, `diff --git ...`). GitHub's compare API doesn't
      // include those — but if a future caller passes a raw `git diff`
      // patch through here we silently skip them rather than crash.
      continue;
    }

    if (line.length === 0) {
      // A trailing newline at the end of the patch produces an empty
      // string after the final split. Tolerate it as a context line —
      // renderer treats it as a blank context row.
      current.lines.push({
        type: 'context',
        content: '',
        oldNumber: oldCursor,
        newNumber: newCursor,
      });
      oldCursor++;
      newCursor++;
      continue;
    }

    const marker = line.charAt(0);
    const body = line.slice(1);

    if (marker === '+') {
      current.lines.push({
        type: 'add',
        content: body,
        oldNumber: null,
        newNumber: newCursor,
      });
      newCursor++;
    } else if (marker === '-') {
      current.lines.push({
        type: 'del',
        content: body,
        oldNumber: oldCursor,
        newNumber: null,
      });
      oldCursor++;
    } else if (marker === '\\') {
      // `\ No newline at end of file` — informational, no number bump.
      current.lines.push({
        type: 'meta',
        content: line,
        oldNumber: null,
        newNumber: null,
      });
    } else {
      // Marker is space (' ') for normal context, but some patches omit
      // the leading space on truly-empty context lines; fall through here
      // for both cases.
      current.lines.push({
        type: 'context',
        content: marker === ' ' ? body : line,
        oldNumber: oldCursor,
        newNumber: newCursor,
      });
      oldCursor++;
      newCursor++;
    }
  }

  return hunks;
}

/**
 * Aggregate stat-counts across all hunks. Mirrors GitHub's
 * "+N -M" summary on each file row. Useful when the consumer has the
 * raw patch text but not the API-supplied additions/deletions counts.
 */
export function summarizePatch(text: string | undefined | null): {
  additions: number;
  deletions: number;
} {
  let additions = 0;
  let deletions = 0;
  for (const hunk of parsePatch(text)) {
    for (const ln of hunk.lines) {
      if (ln.type === 'add') additions++;
      else if (ln.type === 'del') deletions++;
    }
  }
  return { additions, deletions };
}
