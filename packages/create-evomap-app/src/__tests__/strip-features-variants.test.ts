import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  stripBlocksForVariant,
  stripFeatures,
} from '../strip-features.js';

describe('stripBlocksForVariant', () => {
  it('keeps only the chosen variant block and drops the others', () => {
    const input = [
      'before',
      '// @evomap:variant(design=minimal) begin',
      'apply-minimal-css',
      '// @evomap:variant(design=minimal) end',
      '// @evomap:variant(design=default) begin',
      'apply-default-css',
      '// @evomap:variant(design=default) end',
      '// @evomap:variant(design=brutalist) begin',
      'apply-brutalist-css',
      '// @evomap:variant(design=brutalist) end',
      'after',
    ].join('\n');

    const out = stripBlocksForVariant(input, 'design', 'minimal');
    expect(out).toContain('apply-minimal-css');
    expect(out).not.toContain('apply-default-css');
    expect(out).not.toContain('apply-brutalist-css');
    expect(out).toContain('before');
    expect(out).toContain('after');
  });

  it('does not touch blocks for a different axis', () => {
    const input = [
      '// @evomap:variant(design=minimal) begin',
      'design-block',
      '// @evomap:variant(design=minimal) end',
      '// @evomap:variant(layout=sidebar) begin',
      'layout-block',
      '// @evomap:variant(layout=sidebar) end',
    ].join('\n');

    const out = stripBlocksForVariant(input, 'design', 'default');
    expect(out).not.toContain('design-block');
    expect(out).toContain('layout-block');
    expect(out).toContain('@evomap:variant(layout=sidebar)');
  });

  it('handles JSX-style {/* … */} block markers', () => {
    const input = [
      'render(',
      '  {/* @evomap:variant(ui=animate-ui) begin */}',
      '  <MotionButton/>',
      '  {/* @evomap:variant(ui=animate-ui) end */}',
      '  {/* @evomap:variant(ui=radix) begin */}',
      '  <RadixButton/>',
      '  {/* @evomap:variant(ui=radix) end */}',
      ');',
    ].join('\n');

    const out = stripBlocksForVariant(input, 'ui', 'animate-ui');
    expect(out).toContain('MotionButton');
    expect(out).not.toContain('RadixButton');
  });

  it('handles values containing dashes (e.g. shadcn-style)', () => {
    const input = [
      '// @evomap:variant(ui=shadcn-style) begin',
      'shadcn-style-block',
      '// @evomap:variant(ui=shadcn-style) end',
      '// @evomap:variant(ui=radix) begin',
      'radix-block',
      '// @evomap:variant(ui=radix) end',
    ].join('\n');

    const out = stripBlocksForVariant(input, 'ui', 'shadcn-style');
    expect(out).toContain('shadcn-style-block');
    expect(out).not.toContain('radix-block');
  });
});

describe('stripFeatures with variants (file-level)', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(path.join(tmpdir(), 'evomap-strip-test-'));
    // The CLI always rewrites package.json so stripFeatures expects one.
    await writeFile(
      path.join(tmp, 'package.json'),
      JSON.stringify({ name: 't', dependencies: {} }),
      'utf8'
    );
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('deletes files whose @evomap:variant(<axis>=<value>) file marker does not match the choice', async () => {
    await writeFile(
      path.join(tmp, 'sidebar.tsx'),
      '// @evomap:variant(layout=sidebar) file\nexport const layout = "sidebar";\n',
      'utf8'
    );
    await writeFile(
      path.join(tmp, 'topbar.tsx'),
      '// @evomap:variant(layout=topbar) file\nexport const layout = "topbar";\n',
      'utf8'
    );
    await writeFile(
      path.join(tmp, 'stacked.tsx'),
      '// @evomap:variant(layout=stacked) file\nexport const layout = "stacked";\n',
      'utf8'
    );

    await stripFeatures(
      tmp,
      { supabase: false, query: true, i18n: true },
      { layout: 'sidebar' }
    );

    await expect(stat(path.join(tmp, 'sidebar.tsx'))).resolves.toBeDefined();
    await expect(stat(path.join(tmp, 'topbar.tsx'))).rejects.toThrow();
    await expect(stat(path.join(tmp, 'stacked.tsx'))).rejects.toThrow();
  });

  it('strips non-chosen variant blocks inside a kept file', async () => {
    const filePath = path.join(tmp, 'styles.css');
    await writeFile(
      filePath,
      [
        '/* @evomap:variant(design=minimal) begin */',
        '.a { color: red; }',
        '/* @evomap:variant(design=minimal) end */',
        '/* @evomap:variant(design=default) begin */',
        '.b { color: blue; }',
        '/* @evomap:variant(design=default) end */',
        '/* @evomap:variant(design=brutalist) begin */',
        '.c { color: hotpink; }',
        '/* @evomap:variant(design=brutalist) end */',
      ].join('\n'),
      'utf8'
    );

    await stripFeatures(
      tmp,
      { supabase: false, query: true, i18n: true },
      { design: 'default' }
    );

    const after = await readFile(filePath, 'utf8');
    expect(after).not.toContain('.a {');
    expect(after).toContain('.b {');
    expect(after).not.toContain('.c {');
  });

  it('is backward compatible: omitting variants leaves variant markers untouched', async () => {
    const filePath = path.join(tmp, 'styles.css');
    const original = [
      '/* @evomap:variant(design=minimal) begin */',
      '.a {}',
      '/* @evomap:variant(design=minimal) end */',
    ].join('\n');
    await writeFile(filePath, original, 'utf8');

    await stripFeatures(tmp, {
      supabase: false,
      query: true,
      i18n: true,
    });

    const after = await readFile(filePath, 'utf8');
    expect(after).toBe(original);
  });
});
