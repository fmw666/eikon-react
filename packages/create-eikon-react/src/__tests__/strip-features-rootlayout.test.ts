/**
 * End-to-end sanity test for the layout-axis dispatcher pattern shipped in
 * `packages/template-react/src/app/layouts/`. We copy the four real layout
 * files + the dispatcher into a temp dir and run `stripFeatures` for each
 * possible `layout` selection, asserting:
 *
 *   - The three non-chosen `*RootLayout.tsx` files are deleted whole-file
 *     (driven by their `@eikon:variant(layout=X) file` first-line markers).
 *   - The dispatcher `RootLayout.tsx` survives, retains the chosen import,
 *     and drops the three non-chosen imports + array entries.
 *   - The remaining `*RootLayout.tsx` is exactly the one we asked for.
 *
 * This is the regression net for the "layout = real JSX variant, not just
 * CSS class" architecture — if anyone reorders or renames the variants
 * without keeping schema + dispatcher + sibling files in sync, this test
 * catches it.
 */

import { cp, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { stripFeatures } from '../strip-features.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// packages/create-eikon-react/src/__tests__ → packages/template-react/src/app/layouts
const LAYOUTS_SRC = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'template-react',
  'src',
  'app',
  'layouts'
);

const ALL_LAYOUTS = [
  'stacked',
  'sidebar',
  'topbar-sidebar',
  'centered',
  'mobile-drawer',
  'bottom-tabs',
  'bottom-tabs-fab',
] as const;
type LayoutChoice = (typeof ALL_LAYOUTS)[number];

function siblingFile(choice: LayoutChoice): string {
  switch (choice) {
    case 'stacked':
      return 'StackedRootLayout.tsx';
    case 'sidebar':
      return 'SidebarRootLayout.tsx';
    case 'topbar-sidebar':
      return 'TopbarSidebarRootLayout.tsx';
    case 'centered':
      return 'CenteredRootLayout.tsx';
    case 'mobile-drawer':
      return 'MobileDrawerRootLayout.tsx';
    case 'bottom-tabs':
      return 'BottomTabsRootLayout.tsx';
    case 'bottom-tabs-fab':
      return 'BottomTabsFabRootLayout.tsx';
  }
}

function importedSymbol(choice: LayoutChoice): string {
  switch (choice) {
    case 'stacked':
      return 'StackedRootLayout';
    case 'sidebar':
      return 'SidebarRootLayout';
    case 'topbar-sidebar':
      return 'TopbarSidebarRootLayout';
    case 'centered':
      return 'CenteredRootLayout';
    case 'mobile-drawer':
      return 'MobileDrawerRootLayout';
    case 'bottom-tabs':
      return 'BottomTabsRootLayout';
    case 'bottom-tabs-fab':
      return 'BottomTabsFabRootLayout';
  }
}

describe('stripFeatures — layout dispatcher + sibling files', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(path.join(tmpdir(), 'eikon-layout-strip-'));
    // stripFeatures expects a package.json at the strip root.
    await writeFile(
      path.join(tmp, 'package.json'),
      JSON.stringify({ name: 't', dependencies: {} }),
      'utf8'
    );
    // Copy the real layout dir (dispatcher + 4 variants) so we're testing
    // against the actual shipped files, not a fixture.
    await cp(LAYOUTS_SRC, path.join(tmp, 'layouts'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  for (const choice of ALL_LAYOUTS) {
    it(`keeps only ${siblingFile(choice)} + RootLayout.tsx when layout="${choice}"`, async () => {
      await stripFeatures(
        tmp,
        { supabase: false, query: true, i18n: true },
        { layout: choice }
      );

      const remaining = (await readdir(path.join(tmp, 'layouts'))).sort();
      expect(remaining).toEqual(['RootLayout.tsx', siblingFile(choice)].sort());

      const dispatcher = await readFile(
        path.join(tmp, 'layouts', 'RootLayout.tsx'),
        'utf8'
      );
      // The chosen sibling's import statement survives.
      const chosenSym = importedSymbol(choice);
      expect(dispatcher).toMatch(
        new RegExp(`import\\s*\\{\\s*${chosenSym}\\s*\\}\\s*from`)
      );
      // Every non-chosen sibling's import statement is gone. Using the
      // full `import { Sym } from` shape sidesteps the substring trap where
      // 'TopbarSidebarRootLayout' contains 'SidebarRootLayout'.
      for (const other of ALL_LAYOUTS) {
        if (other === choice) continue;
        const otherSym = importedSymbol(other);
        expect(dispatcher).not.toMatch(
          new RegExp(`import\\s*\\{\\s*${otherSym}\\s*\\}\\s*from`)
        );
      }
    });
  }
});
