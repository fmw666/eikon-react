/**
 * @file strip-features-file-marker.test.ts
 * @description Regression coverage for the rule that file-level markers are
 *  only honoured on the FIRST LINE of the file. Before this rule, any
 *  documentation that quoted the marker as a literal (in fenced code blocks,
 *  in tree diagrams, in narrative prose) would be silently deleted whenever
 *  the corresponding feature was stripped — see
 *  `packages/template-react/.agent/skills/enable-supabase/SKILL.md`.
 */

// =================================================================================================
// Imports
// =================================================================================================

import {
  existsSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { stripFeatures } from '../strip-features.js';

// =================================================================================================
// Fixtures
// =================================================================================================

const FLAGS = { supabase: false, i18n: true } as const;

// =================================================================================================
// Tests
// =================================================================================================

describe('stripFeatures — file marker is first-line-only', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'strip-marker-'));
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'x', dependencies: {} })
    );
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('deletes a file whose FIRST line is a feature(file) marker', async () => {
    const file = path.join(dir, 'supabase.ts');
    writeFileSync(
      file,
      ['// @eikon:feature(supabase) file', 'export const x = 1;'].join('\n')
    );
    await stripFeatures(dir, FLAGS);
    expect(existsSync(file)).toBe(false);
  });

  it('keeps a markdown file that mentions the marker inside a code fence', async () => {
    const file = path.join(dir, 'SKILL.md');
    writeFileSync(
      file,
      [
        '---',
        'id: enable-supabase',
        '---',
        '',
        'See:',
        '',
        '```ts',
        '// @eikon:feature(supabase) file',
        'export const supabase = createClient();',
        '```',
      ].join('\n')
    );
    await stripFeatures(dir, FLAGS);
    expect(existsSync(file)).toBe(true);
  });

  it('keeps a doc that mentions the marker in narrative prose', async () => {
    const file = path.join(dir, 'note.md');
    writeFileSync(
      file,
      [
        '# Notes',
        '',
        'Open the file with `// @eikon:feature(supabase) file` on line 1.',
      ].join('\n')
    );
    await stripFeatures(dir, FLAGS);
    expect(existsSync(file)).toBe(true);
  });

  it('honours leading whitespace on the first line', async () => {
    const file = path.join(dir, 'with-indent.ts');
    writeFileSync(
      file,
      [
        '   // @eikon:feature(supabase) file',
        'export const x = 1;',
      ].join('\n')
    );
    await stripFeatures(dir, FLAGS);
    expect(existsSync(file)).toBe(false);
  });

  it('does NOT honour the marker on line 2 even if line 1 is empty', async () => {
    const file = path.join(dir, 'line2.ts');
    writeFileSync(
      file,
      ['', '// @eikon:feature(supabase) file', 'export const x = 1;'].join('\n')
    );
    await stripFeatures(dir, FLAGS);
    // Line-1 must be the marker; empty line 1 doesn't count.
    expect(existsSync(file)).toBe(true);
  });

  it('keeps a file whose first line is a YAML frontmatter delimiter', async () => {
    // `.md` files frequently start with `---` for YAML frontmatter; that
    // guarantees the marker (even if it appears later in the file) is
    // ignored — exactly the case that bit us in real `.agent/skills/*.md`.
    const file = path.join(dir, 'with-frontmatter.md');
    writeFileSync(
      file,
      [
        '---',
        'title: example',
        '---',
        '',
        '// @eikon:feature(supabase) file',
      ].join('\n')
    );
    await stripFeatures(dir, FLAGS);
    expect(existsSync(file)).toBe(true);
  });
});
