/**
 * @file strip-features-options.test.ts
 * @description Regression coverage around two contracts strip-features owes
 *  its callers:
 *
 *   - The `examples` feature is shipped unconditionally. The CLI never
 *     adds 'examples' to the disabled set, so `src/features/examples/`
 *     stays on disk and `web-vitals` / `@tanstack/react-virtual` /
 *     `cmdk` survive the dependency prune. Production bundles stay
 *     clean via the runtime `import.meta.env.DEV` gate in
 *     `app/router.tsx`, not via scaffold-time stripping.
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

const FLAGS = { supabase: false, i18n: true } as const;
const DEFAULT_VARIANTS = {
  platform: 'web',
  design: 'default',
  layout: 'stacked',
  ui: 'animate-ui',
  toastPosition: 'top-right',
} as const;

/**
 * Spin up a fixture tree that mirrors the load-bearing parts of
 * template-react: the examples feature directory, a couple of variant
 * sibling files (one chosen, one unchosen), and a `package.json` carrying
 * the examples-tagged deps.
 */
function setupFixture(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'strip-options-'));

  // package.json — populated with the deps the examples feature used
  // to claim. They no longer get pruned (examples ships unconditionally),
  // so the assertions below check they SURVIVE the strip.
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

  // src/features/examples — a tiny tree that the strip used to sweep
  // as a directory-level remove. Kept here so we can assert it
  // SURVIVES under the new default.
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
// Tests — examples (always kept)
// =================================================================================================

describe('stripFeatures — examples ships unconditionally', () => {
  let dir: string;
  beforeEach(() => {
    dir = setupFixture();
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('default: keeps src/features/examples/ on disk', async () => {
    await stripFeatures(dir, FLAGS, DEFAULT_VARIANTS);

    const examplesDir = path.join(dir, 'src', 'features', 'examples');
    expect(existsSync(examplesDir)).toBe(true);
    expect(existsSync(path.join(examplesDir, 'index.ts'))).toBe(true);
    expect(existsSync(path.join(examplesDir, 'routes.tsx'))).toBe(true);
  });

  it('default: keeps showcase deps in package.json (no prune)', async () => {
    await stripFeatures(dir, FLAGS, DEFAULT_VARIANTS);

    const pkg = JSON.parse(
      readFileSync(path.join(dir, 'package.json'), 'utf8')
    ) as { dependencies?: Record<string, string> };
    expect(pkg.dependencies).toBeDefined();
    expect(pkg.dependencies!['web-vitals']).toBeDefined();
    expect(pkg.dependencies!['@tanstack/react-virtual']).toBeDefined();
    expect(pkg.dependencies!['react']).toBeDefined();
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
});

// =================================================================================================
// Tests — keepAllVariants (per-axis block + file strip opt-out)
// =================================================================================================

describe('stripFeatures — keepAllVariants', () => {
  let dir: string;
  beforeEach(() => {
    dir = setupFixture();
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('keepAllVariants=["layout"]: keeps all layout sibling files AND keeps block-level layout markers', async () => {
    // The playground's runtime-dispatch path: source for every variant
    // value coexists in the build so the iframe can swap with no
    // rebuild. Both the file-level strip and the block-level strip
    // skip — the dispatcher in RootLayout.tsx ends up containing
    // *both* import lines.
    await stripFeatures(dir, FLAGS, DEFAULT_VARIANTS, {
      keepAllVariants: ['layout'],
    });

    // File-level: every sibling stays.
    expect(
      existsSync(path.join(dir, 'src', 'app', 'layouts', 'StackedRootLayout.tsx'))
    ).toBe(true);
    expect(
      existsSync(path.join(dir, 'src', 'app', 'layouts', 'SidebarRootLayout.tsx'))
    ).toBe(true);

    // Block-level: every block survives in the dispatcher.
    const dispatcher = readFileSync(
      path.join(dir, 'src', 'app', 'layouts', 'RootLayout.tsx'),
      'utf8'
    );
    expect(dispatcher).toContain('StackedRootLayout');
    expect(dispatcher).toContain('SidebarRootLayout');
  });

  it('keepAllVariants=[] (default): full strip — same as not passing the option', async () => {
    await stripFeatures(dir, FLAGS, DEFAULT_VARIANTS, { keepAllVariants: [] });

    expect(
      existsSync(path.join(dir, 'src', 'app', 'layouts', 'SidebarRootLayout.tsx'))
    ).toBe(false);
    const dispatcher = readFileSync(
      path.join(dir, 'src', 'app', 'layouts', 'RootLayout.tsx'),
      'utf8'
    );
    expect(dispatcher).not.toContain('SidebarRootLayout');
  });

  it('keepAllVariants does NOT affect axes outside its list', async () => {
    // Listing only `design` should leave `layout` strip behaviour intact.
    await stripFeatures(dir, FLAGS, DEFAULT_VARIANTS, {
      keepAllVariants: ['design'],
    });

    expect(
      existsSync(path.join(dir, 'src', 'app', 'layouts', 'SidebarRootLayout.tsx'))
    ).toBe(false);
    const dispatcher = readFileSync(
      path.join(dir, 'src', 'app', 'layouts', 'RootLayout.tsx'),
      'utf8'
    );
    expect(dispatcher).not.toContain('SidebarRootLayout');
  });
});
