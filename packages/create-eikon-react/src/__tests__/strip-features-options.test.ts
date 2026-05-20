/**
 * @file strip-features-options.test.ts
 * @description Regression coverage for the `StripOptions` knobs that the
 *  in-repo preview playground depends on:
 *
 *   - `keepExamples: true` must keep the `src/features/examples/` tree
 *     and its `package.json` deps (`web-vitals`, `@tanstack/react-virtual`).
 *     Default behaviour (or `keepExamples: false`) must continue to strip
 *     them so end users of `create-eikon-react` never carry showcase code.
 *
 *   - `keepAllVariantFiles: true` must preserve every variant sibling on
 *     disk even when the variant value doesn't match the chosen one.
 *     Block-level variant stripping must still run, so dispatchers still
 *     narrow to the user's selection. Default behaviour drops unchosen
 *     sibling files (which is what real scaffolds want).
 */

// =================================================================================================
// Imports
// =================================================================================================

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
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

const FLAGS = { supabase: false, query: true, i18n: true } as const;
const DEFAULT_VARIANTS = {
  design: 'default',
  layout: 'stacked',
  ui: 'animate-ui',
  toast: 'default',
} as const;

/**
 * Spin up a fixture tree that mirrors the load-bearing parts of
 * template-react: the examples feature directory, a couple of variant
 * sibling files (one chosen, one unchosen), and a `package.json` carrying
 * the examples-tagged deps.
 */
function setupFixture(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'strip-options-'));

  // package.json — populated with the deps the examples feature claims to
  // own (`web-vitals`, `@tanstack/react-virtual`) so we can assert pruning.
  writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: 'fixture',
      dependencies: {
        react: '19.0.0',
        'web-vitals': '4.0.0',
        '@tanstack/react-virtual': '3.0.0',
      },
    })
  );

  // src/features/examples — a tiny tree the strip should sweep as a
  // directory-level remove (`isInsideExamplesDir`).
  const examplesDir = path.join(dir, 'src', 'features', 'examples');
  mkdirSync(examplesDir, { recursive: true });
  writeFileSync(
    path.join(examplesDir, 'index.ts'),
    'export const examplesRoutes = null;\n'
  );
  writeFileSync(
    path.join(examplesDir, 'routes.tsx'),
    'export const examplesRoutes = null;\n'
  );

  // Variant siblings — chosen one carries the matching file marker; the
  // unchosen one carries a different value so the default strip wants to
  // drop it.
  const layoutsDir = path.join(dir, 'src', 'app', 'layouts');
  mkdirSync(layoutsDir, { recursive: true });
  writeFileSync(
    path.join(layoutsDir, 'StackedRootLayout.tsx'),
    '// @eikon:variant(layout=stacked) file\nexport const x = 1;\n'
  );
  writeFileSync(
    path.join(layoutsDir, 'SidebarRootLayout.tsx'),
    '// @eikon:variant(layout=sidebar) file\nexport const x = 1;\n'
  );

  // Variant block — the dispatcher pattern. Block stripping should keep
  // only the chosen value's block under BOTH options regimes.
  writeFileSync(
    path.join(layoutsDir, 'RootLayout.tsx'),
    [
      '// @eikon:variant(layout=stacked) begin',
      'import { StackedRootLayout } from "./StackedRootLayout";',
      '// @eikon:variant(layout=stacked) end',
      '// @eikon:variant(layout=sidebar) begin',
      'import { SidebarRootLayout } from "./SidebarRootLayout";',
      '// @eikon:variant(layout=sidebar) end',
      '',
    ].join('\n')
  );

  return dir;
}

// =================================================================================================
// Tests — keepExamples
// =================================================================================================

describe('stripFeatures — keepExamples', () => {
  let dir: string;
  beforeEach(() => {
    dir = setupFixture();
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('default (no option): removes src/features/examples/ + its deps', async () => {
    await stripFeatures(dir, FLAGS, DEFAULT_VARIANTS);

    const examplesDir = path.join(dir, 'src', 'features', 'examples');
    expect(existsSync(examplesDir)).toBe(false);

    const pkg = JSON.parse(
      readFileSync(path.join(dir, 'package.json'), 'utf8')
    ) as { dependencies?: Record<string, string> };
    expect(pkg.dependencies).toBeDefined();
    expect(pkg.dependencies!['web-vitals']).toBeUndefined();
    expect(pkg.dependencies!['@tanstack/react-virtual']).toBeUndefined();
    // Unrelated deps survive — pruning is feature-scoped.
    expect(pkg.dependencies!['react']).toBeDefined();
  });

  it('keepExamples=false (explicit): same as default — removes examples', async () => {
    await stripFeatures(dir, FLAGS, DEFAULT_VARIANTS, { keepExamples: false });

    expect(existsSync(path.join(dir, 'src', 'features', 'examples'))).toBe(
      false
    );
  });

  it('keepExamples=true: keeps src/features/examples/ and its deps', async () => {
    await stripFeatures(dir, FLAGS, DEFAULT_VARIANTS, { keepExamples: true });

    const examplesDir = path.join(dir, 'src', 'features', 'examples');
    expect(existsSync(examplesDir)).toBe(true);
    expect(existsSync(path.join(examplesDir, 'index.ts'))).toBe(true);
    expect(existsSync(path.join(examplesDir, 'routes.tsx'))).toBe(true);

    const pkg = JSON.parse(
      readFileSync(path.join(dir, 'package.json'), 'utf8')
    ) as { dependencies?: Record<string, string> };
    expect(pkg.dependencies!['web-vitals']).toBeDefined();
    expect(pkg.dependencies!['@tanstack/react-virtual']).toBeDefined();
  });
});

// =================================================================================================
// Tests — keepAllVariantFiles
// =================================================================================================

describe('stripFeatures — keepAllVariantFiles', () => {
  let dir: string;
  beforeEach(() => {
    dir = setupFixture();
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('default (no option): unchosen variant sibling files are removed', async () => {
    await stripFeatures(dir, FLAGS, DEFAULT_VARIANTS);

    expect(
      existsSync(path.join(dir, 'src', 'app', 'layouts', 'StackedRootLayout.tsx'))
    ).toBe(true); // chosen
    expect(
      existsSync(path.join(dir, 'src', 'app', 'layouts', 'SidebarRootLayout.tsx'))
    ).toBe(false); // unchosen
  });

  it('keepAllVariantFiles=true: every variant sibling survives on disk', async () => {
    await stripFeatures(dir, FLAGS, DEFAULT_VARIANTS, {
      keepAllVariantFiles: true,
    });

    expect(
      existsSync(path.join(dir, 'src', 'app', 'layouts', 'StackedRootLayout.tsx'))
    ).toBe(true); // chosen
    expect(
      existsSync(path.join(dir, 'src', 'app', 'layouts', 'SidebarRootLayout.tsx'))
    ).toBe(true); // unchosen — kept because of the option
  });

  it('keepAllVariantFiles=true: block-level variant strip STILL runs (dispatcher narrows)', async () => {
    // The block-level strip is what makes the playground's variant
    // selection feel real — picking a different `layout` still rewires
    // the RootLayout dispatcher to point at the chosen sibling, even
    // though every sibling stays on disk.
    await stripFeatures(dir, FLAGS, DEFAULT_VARIANTS, {
      keepAllVariantFiles: true,
    });

    const dispatcher = readFileSync(
      path.join(dir, 'src', 'app', 'layouts', 'RootLayout.tsx'),
      'utf8'
    );
    expect(dispatcher).toContain('StackedRootLayout'); // chosen block kept
    expect(dispatcher).not.toContain('SidebarRootLayout'); // unchosen block dropped
  });

  it('keepAllVariantFiles + keepExamples compose without interfering', async () => {
    // The two playground options stack — every showcase file present
    // AND every variant sibling present, which is exactly what the
    // preview-site builder asks for.
    await stripFeatures(dir, FLAGS, DEFAULT_VARIANTS, {
      keepExamples: true,
      keepAllVariantFiles: true,
    });

    expect(existsSync(path.join(dir, 'src', 'features', 'examples'))).toBe(
      true
    );
    expect(
      existsSync(path.join(dir, 'src', 'app', 'layouts', 'StackedRootLayout.tsx'))
    ).toBe(true);
    expect(
      existsSync(path.join(dir, 'src', 'app', 'layouts', 'SidebarRootLayout.tsx'))
    ).toBe(true);
  });
});
