import { describe, expect, it } from 'vitest';

import { parsePatch, summarizePatch } from '../diff-parser';

describe('parsePatch', () => {
  it('returns empty array for empty / nullish input', () => {
    expect(parsePatch('')).toEqual([]);
    expect(parsePatch(undefined)).toEqual([]);
    expect(parsePatch(null)).toEqual([]);
  });

  it('parses a simple modification hunk with correct line numbers', () => {
    const patch = [
      '@@ -1,3 +1,4 @@',
      ' a',
      '-b',
      '+B',
      '+B2',
      ' c',
    ].join('\n');
    const hunks = parsePatch(patch);
    expect(hunks).toHaveLength(1);
    const h = hunks[0]!;
    expect(h.header).toBe('@@ -1,3 +1,4 @@');
    expect(h.oldStart).toBe(1);
    expect(h.oldLines).toBe(3);
    expect(h.newStart).toBe(1);
    expect(h.newLines).toBe(4);
    expect(h.lines.map((l) => l.type)).toEqual([
      'context',
      'del',
      'add',
      'add',
      'context',
    ]);
    expect(h.lines.map((l) => l.oldNumber)).toEqual([1, 2, null, null, 3]);
    expect(h.lines.map((l) => l.newNumber)).toEqual([1, null, 2, 3, 4]);
  });

  it('handles default-of-1 hunk counts (`@@ -3 +3 @@`)', () => {
    const patch = ['@@ -3 +3 @@', '-a', '+A'].join('\n');
    const [h] = parsePatch(patch);
    expect(h?.oldLines).toBe(1);
    expect(h?.newLines).toBe(1);
    expect(h?.lines.map((l) => l.type)).toEqual(['del', 'add']);
  });

  it('captures multiple hunks and resets cursors per header', () => {
    const patch = [
      '@@ -1,1 +1,1 @@',
      '-a',
      '+A',
      '@@ -10,2 +10,2 @@',
      ' x',
      '-y',
      '+Y',
    ].join('\n');
    const hunks = parsePatch(patch);
    expect(hunks).toHaveLength(2);
    expect(hunks[1]?.lines.map((l) => l.type)).toEqual([
      'context',
      'del',
      'add',
    ]);
    expect(hunks[1]?.lines[1]?.oldNumber).toBe(11);
    expect(hunks[1]?.lines[1]?.newNumber).toBeNull();
    expect(hunks[1]?.lines[2]?.oldNumber).toBeNull();
    expect(hunks[1]?.lines[2]?.newNumber).toBe(11);
  });

  it('treats `\\ No newline at end of file` as meta', () => {
    const patch = [
      '@@ -1,1 +1,1 @@',
      '-foo',
      '+bar',
      '\\ No newline at end of file',
    ].join('\n');
    const lines = parsePatch(patch)[0]?.lines ?? [];
    expect(lines[lines.length - 1]?.type).toBe('meta');
  });

  it('tolerates CRLF line endings', () => {
    const patch = '@@ -1,1 +1,1 @@\r\n-a\r\n+b\r\n';
    const lines = parsePatch(patch)[0]?.lines ?? [];
    expect(lines.map((l) => l.content)).toEqual(['a', 'b', '']);
  });

  it('handles file-added hunk header (`-0,0 +1,N`)', () => {
    const patch = ['@@ -0,0 +1,2 @@', '+hello', '+world'].join('\n');
    const [h] = parsePatch(patch);
    expect(h?.oldStart).toBe(0);
    expect(h?.oldLines).toBe(0);
    expect(h?.lines.map((l) => l.newNumber)).toEqual([1, 2]);
    expect(h?.lines.every((l) => l.type === 'add')).toBe(true);
  });

  it('skips pre-hunk patch metadata (--- / +++ / diff --git)', () => {
    const patch = [
      'diff --git a/x b/x',
      '--- a/x',
      '+++ b/x',
      '@@ -1,1 +1,1 @@',
      '-a',
      '+b',
    ].join('\n');
    const hunks = parsePatch(patch);
    expect(hunks).toHaveLength(1);
    expect(hunks[0]?.lines).toHaveLength(2);
  });
});

describe('summarizePatch', () => {
  it('counts additions and deletions', () => {
    const patch = [
      '@@ -1,3 +1,4 @@',
      ' a',
      '-b',
      '+B',
      '+B2',
      ' c',
    ].join('\n');
    expect(summarizePatch(patch)).toEqual({ additions: 2, deletions: 1 });
  });

  it('returns zeros for empty input', () => {
    expect(summarizePatch(undefined)).toEqual({ additions: 0, deletions: 0 });
  });
});
