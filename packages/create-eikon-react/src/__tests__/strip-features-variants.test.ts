import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  stripBlocksForVariant,
  stripFeatures,
} from '../strip-features.js';

describe('stripBlocksForVariant', () => {
  // Mechanism-level test: stripBlocksForVariant doesn't validate values
  // against any real `VARIANT_CHOICES` set, so we use synthetic axis values
  // ('foo' / 'bar' / 'baz') to keep these tests visibly decoupled from the
  // actual design / ui / layout preset names defined in src/index.ts.
  it('keeps only the chosen variant block and drops the others', () => {
    const input = [
      'before',
      '// @eikon:variant(design=foo) begin',
      'apply-foo-css',
      '// @eikon:variant(design=foo) end',
      '// @eikon:variant(design=bar) begin',
      'apply-bar-css',
      '// @eikon:variant(design=bar) end',
      '// @eikon:variant(design=baz) begin',
      'apply-baz-css',
      '// @eikon:variant(design=baz) end',
      'after',
    ].join('\n');

    const out = stripBlocksForVariant(input, 'design', 'foo');
    expect(out).toContain('apply-foo-css');
    expect(out).not.toContain('apply-bar-css');
    expect(out).not.toContain('apply-baz-css');
    expect(out).toContain('before');
    expect(out).toContain('after');
  });

  it('does not touch blocks for a different axis', () => {
    const input = [
      '// @eikon:variant(design=foo) begin',
      'design-block',
      '// @eikon:variant(design=foo) end',
      '// @eikon:variant(layout=sidebar) begin',
      'layout-block',
      '// @eikon:variant(layout=sidebar) end',
    ].join('\n');

    const out = stripBlocksForVariant(input, 'design', 'bar');
    expect(out).not.toContain('design-block');
    expect(out).toContain('layout-block');
    expect(out).toContain('@eikon:variant(layout=sidebar)');
  });

  it('handles JSX-style {/* … */} block markers', () => {
    const input = [
      'render(',
      '  {/* @eikon:variant(ui=animate-ui) begin */}',
      '  <MotionButton/>',
      '  {/* @eikon:variant(ui=animate-ui) end */}',
      '  {/* @eikon:variant(ui=radix) begin */}',
      '  <RadixButton/>',
      '  {/* @eikon:variant(ui=radix) end */}',
      ');',
    ].join('\n');

    const out = stripBlocksForVariant(input, 'ui', 'animate-ui');
    expect(out).toContain('MotionButton');
    expect(out).not.toContain('RadixButton');
  });

  it('handles values containing dashes (e.g. shadcn-style)', () => {
    const input = [
      '// @eikon:variant(ui=shadcn-style) begin',
      'shadcn-style-block',
      '// @eikon:variant(ui=shadcn-style) end',
      '// @eikon:variant(ui=radix) begin',
      'radix-block',
      '// @eikon:variant(ui=radix) end',
    ].join('\n');

    const out = stripBlocksForVariant(input, 'ui', 'shadcn-style');
    expect(out).toContain('shadcn-style-block');
    expect(out).not.toContain('radix-block');
  });

  it('does not swallow a structural `}` adjacent to a CSS end marker', () => {
    // Regression — earlier the END regex's optional close-brace clause
    // was `\\*\\/\\s*\\}?`, which let `\\s*` greedily eat the newline
    // between `*/` and the next-line `}`, swallowing the `@theme {…}`
    // close brace. Tailwind v4 then choked with "Missing closing }".
    // Locking this in with a CSS-shaped fixture.
    const input = [
      '@theme {',
      '  --color-foo: red;',
      '  /* @eikon:variant(platform=mobile) begin */',
      '  --touch-target-min: 44px;',
      '  /* @eikon:variant(platform=mobile) end */',
      '}',
      '@variant dark (&:where(.dark));',
    ].join('\n');

    const out = stripBlocksForVariant(input, 'platform', 'web');

    expect(out).not.toContain('--touch-target-min');
    // The closing brace of the @theme block MUST survive the strip.
    expect(out).toContain('}\n@variant dark');
    // And brace balance must be preserved end-to-end.
    const opens = (out.match(/\{/g) ?? []).length;
    const closes = (out.match(/\}/g) ?? []).length;
    expect(opens).toBe(closes);
  });

  it('still handles a JSX `*/}` adjacent end marker when block is non-kept', () => {
    // The mirror case: removing the `\\s*` between `*/` and `\\}?` must
    // NOT regress the JSX `{/* @eikon:variant(...) end */}` shape — the
    // closer is intentionally fused, so the regex still needs to match.
    const input = [
      'render(',
      '  {/* @eikon:variant(ui=animate-ui) begin */}',
      '  <MotionButton/>',
      '  {/* @eikon:variant(ui=animate-ui) end */}',
      ');',
    ].join('\n');

    const out = stripBlocksForVariant(input, 'ui', 'radix');
    expect(out).not.toContain('MotionButton');
    expect(out).not.toContain('@eikon:variant(ui=animate-ui)');
    // The `render(` and `);` lines on either side must be preserved
    // intact — no orphan braces or stray `}` left behind.
    expect(out).toContain('render(');
    expect(out).toContain(');');
  });
});

describe('stripFeatures with variants (file-level)', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(path.join(tmpdir(), 'eikon-strip-test-'));
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

  it('deletes files whose @eikon:variant(<axis>=<value>) file marker does not match the choice', async () => {
    await writeFile(
      path.join(tmp, 'sidebar.tsx'),
      '// @eikon:variant(layout=sidebar) file\nexport const layout = "sidebar";\n',
      'utf8'
    );
    await writeFile(
      path.join(tmp, 'topbar.tsx'),
      '// @eikon:variant(layout=topbar) file\nexport const layout = "topbar";\n',
      'utf8'
    );
    await writeFile(
      path.join(tmp, 'stacked.tsx'),
      '// @eikon:variant(layout=stacked) file\nexport const layout = "stacked";\n',
      'utf8'
    );

    await stripFeatures(
      tmp,
      { supabase: false },
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
        '/* @eikon:variant(design=foo) begin */',
        '.a { color: red; }',
        '/* @eikon:variant(design=foo) end */',
        '/* @eikon:variant(design=bar) begin */',
        '.b { color: blue; }',
        '/* @eikon:variant(design=bar) end */',
        '/* @eikon:variant(design=baz) begin */',
        '.c { color: hotpink; }',
        '/* @eikon:variant(design=baz) end */',
      ].join('\n'),
      'utf8'
    );

    await stripFeatures(
      tmp,
      { supabase: false },
      { design: 'bar' }
    );

    const after = await readFile(filePath, 'utf8');
    expect(after).not.toContain('.a {');
    expect(after).toContain('.b {');
    expect(after).not.toContain('.c {');
  });

  it('is backward compatible: omitting variants leaves variant markers untouched', async () => {
    const filePath = path.join(tmp, 'styles.css');
    const original = [
      '/* @eikon:variant(design=foo) begin */',
      '.a {}',
      '/* @eikon:variant(design=foo) end */',
    ].join('\n');
    await writeFile(filePath, original, 'utf8');

    await stripFeatures(tmp, {
      supabase: false,
    });

    const after = await readFile(filePath, 'utf8');
    expect(after).toBe(original);
  });
});
