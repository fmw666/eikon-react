/**
 * @file strip-features-platform-content.test.ts
 * @description End-to-end content checks for platform-keyed strip
 * markers: when the user picks `--platform web` (or `desktop`), the
 * scaffolded project must NOT carry mobile-only meta tags, CSS
 * tokens, Vite mode branches, or the mobile-drawer Sheet primitive.
 * Conversely, picking `--platform mobile` must keep them.
 *
 * Why a dedicated suite (and not a few more cases in
 * `strip-features-platform.test.ts`):
 *   - That test focuses on directory deletion + script pruning, which
 *     is "structural" platform stripping.
 *   - This test focuses on `@eikon:variant(platform=…)` block / file
 *     markers inside text files — the "content" pass. Keeping the
 *     two halves in separate suites lets each fixture stay tightly
 *     scoped (no cross-pollination of fixture shape between suites).
 *
 * Fixtures here are minimal text snippets that mimic the real shapes
 * we ship in `index.html`, `src/styles/index.css`, `vite.config.ts`,
 * and `src/shared/ui/sheet.tsx`. We don't copy the real files; we
 * forge the smallest excerpt that still exercises the marker rule we
 * want to lock in. This keeps the suite stable when the surrounding
 * template content evolves — only the markers themselves are under test.
 */

// =================================================================================================
// Imports
// =================================================================================================

import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { stripFeatures } from '../strip-features.js';

// =================================================================================================
// Fixture
// =================================================================================================

const FLAGS = { supabase: false, query: true, i18n: true } as const;

/**
 * Minimal package.json so `pruneDependencies` / `prunePackageScripts`
 * have something to read. Content is irrelevant to the marker tests.
 */
const PACKAGE_JSON = JSON.stringify(
  {
    name: 'fixture',
    scripts: { build: 'vite build' },
    dependencies: { react: '19.0.0' },
  },
  null,
  2
);

const HTML_FIXTURE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover"
    />
    <meta name="theme-color" content="#0a0a0a" />
    <!-- @eikon:variant(platform=mobile) begin -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta
      name="apple-mobile-web-app-status-bar-style"
      content="black-translucent"
    />
    <meta name="mobile-web-app-capable" content="yes" />
    <!-- @eikon:variant(platform=mobile) end -->
    <title>Eikon App</title>
  </head>
  <body><div id="root"></div></body>
</html>
`;

const CSS_FIXTURE = `@theme {
  --color-background: oklch(1 0 0);
  /* @eikon:variant(platform=mobile) begin */
  --touch-target-min: 44px;
  /* @eikon:variant(platform=mobile) end */
}
/* @eikon:variant(platform=mobile) begin */
@utility safe-pt {
  padding-top: env(safe-area-inset-top);
}
@utility safe-pb {
  padding-bottom: env(safe-area-inset-bottom);
}
/* @eikon:variant(platform=mobile) end */
`;

const VITE_FIXTURE = `import { defineConfig } from 'vite';
export default defineConfig(({ mode: _mode }) => ({
  plugins: [],
  // @eikon:variant(platform=mobile) begin
  base: _mode === 'capacitor' ? '' : '/',
  // @eikon:variant(platform=mobile) end
}));
`;

const SHEET_FIXTURE = `// @eikon:variant(layout=mobile-drawer) file
/**
 * @file sheet.tsx
 * @description Mobile drawer primitive.
 */
export function Sheet() {}
`;

async function setupFixture(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'eikon-platform-content-'));
  await writeFile(path.join(dir, 'package.json'), PACKAGE_JSON);
  await writeFile(path.join(dir, 'index.html'), HTML_FIXTURE);
  await writeFile(path.join(dir, 'vite.config.ts'), VITE_FIXTURE);
  await mkdir(path.join(dir, 'src', 'styles'), { recursive: true });
  await writeFile(path.join(dir, 'src', 'styles', 'index.css'), CSS_FIXTURE);
  await mkdir(path.join(dir, 'src', 'shared', 'ui'), { recursive: true });
  await writeFile(
    path.join(dir, 'src', 'shared', 'ui', 'sheet.tsx'),
    SHEET_FIXTURE
  );
  return dir;
}

// =================================================================================================
// Tests
// =================================================================================================

describe('stripFeatures — platform=web removes mobile-only content', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await setupFixture();
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('strips iOS / Android PWA meta tags from index.html', async () => {
    await stripFeatures(dir, FLAGS, { platform: 'web', layout: 'stacked' });
    const html = await readFile(path.join(dir, 'index.html'), 'utf8');
    expect(html).not.toContain('apple-mobile-web-app-capable');
    expect(html).not.toContain('apple-mobile-web-app-status-bar-style');
    expect(html).not.toContain('mobile-web-app-capable');
    // viewport-fit=cover is universal — kept on every platform
    expect(html).toContain('viewport-fit=cover');
  });

  it('strips --touch-target-min token and safe-* utilities from index.css', async () => {
    await stripFeatures(dir, FLAGS, { platform: 'web', layout: 'stacked' });
    const css = await readFile(
      path.join(dir, 'src', 'styles', 'index.css'),
      'utf8'
    );
    expect(css).not.toContain('--touch-target-min');
    expect(css).not.toContain('@utility safe-pt');
    expect(css).not.toContain('@utility safe-pb');
    // Surrounding non-mobile @theme content must still be present.
    expect(css).toContain('--color-background');
  });

  it('strips capacitor-mode branch from vite.config.ts', async () => {
    await stripFeatures(dir, FLAGS, { platform: 'web', layout: 'stacked' });
    const vite = await readFile(path.join(dir, 'vite.config.ts'), 'utf8');
    expect(vite).not.toContain("'capacitor'");
    expect(vite).not.toContain('base:');
    // The function signature must still reference `_mode` (the alias is
    // there on purpose so the unused parameter passes lint after strip).
    expect(vite).toContain('_mode');
  });

  it('removes shared/ui/sheet.tsx (only mobile-drawer layout uses it)', async () => {
    await stripFeatures(dir, FLAGS, { platform: 'web', layout: 'stacked' });
    expect(
      existsSync(path.join(dir, 'src', 'shared', 'ui', 'sheet.tsx'))
    ).toBe(false);
  });
});

describe('stripFeatures — platform=desktop also removes mobile-only content', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await setupFixture();
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('drops mobile meta + CSS + capacitor branch on desktop', async () => {
    await stripFeatures(dir, FLAGS, { platform: 'desktop', layout: 'sidebar' });
    const html = await readFile(path.join(dir, 'index.html'), 'utf8');
    const css = await readFile(
      path.join(dir, 'src', 'styles', 'index.css'),
      'utf8'
    );
    const vite = await readFile(path.join(dir, 'vite.config.ts'), 'utf8');
    expect(html).not.toContain('apple-mobile-web-app-capable');
    expect(css).not.toContain('--touch-target-min');
    expect(vite).not.toContain("'capacitor'");
  });

  it('also removes shared/ui/sheet.tsx (no mobile-drawer on desktop)', async () => {
    await stripFeatures(dir, FLAGS, { platform: 'desktop', layout: 'sidebar' });
    expect(
      existsSync(path.join(dir, 'src', 'shared', 'ui', 'sheet.tsx'))
    ).toBe(false);
  });
});

describe('stripFeatures — platform=mobile keeps mobile-only content', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await setupFixture();
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('keeps mobile PWA meta tags', async () => {
    await stripFeatures(dir, FLAGS, {
      platform: 'mobile',
      layout: 'mobile-drawer',
    });
    const html = await readFile(path.join(dir, 'index.html'), 'utf8');
    expect(html).toContain('apple-mobile-web-app-capable');
    expect(html).toContain('mobile-web-app-capable');
  });

  it('keeps --touch-target-min and safe-* utilities', async () => {
    await stripFeatures(dir, FLAGS, {
      platform: 'mobile',
      layout: 'mobile-drawer',
    });
    const css = await readFile(
      path.join(dir, 'src', 'styles', 'index.css'),
      'utf8'
    );
    expect(css).toContain('--touch-target-min: 44px');
    expect(css).toContain('@utility safe-pt');
  });

  it('keeps the capacitor-mode base branch', async () => {
    await stripFeatures(dir, FLAGS, {
      platform: 'mobile',
      layout: 'mobile-drawer',
    });
    const vite = await readFile(path.join(dir, 'vite.config.ts'), 'utf8');
    expect(vite).toContain("_mode === 'capacitor'");
  });

  it('keeps shared/ui/sheet.tsx when layout=mobile-drawer', async () => {
    await stripFeatures(dir, FLAGS, {
      platform: 'mobile',
      layout: 'mobile-drawer',
    });
    expect(
      existsSync(path.join(dir, 'src', 'shared', 'ui', 'sheet.tsx'))
    ).toBe(true);
  });

  it('removes sheet.tsx even on mobile if layout is bottom-tabs', async () => {
    // Mobile platform doesn't automatically keep sheet.tsx — only the
    // mobile-drawer layout uses it. Centered + BottomTabs* mobile
    // layouts must NOT carry the unused primitive.
    await stripFeatures(dir, FLAGS, {
      platform: 'mobile',
      layout: 'bottom-tabs',
    });
    expect(
      existsSync(path.join(dir, 'src', 'shared', 'ui', 'sheet.tsx'))
    ).toBe(false);
  });
});

describe('stripFeatures — keepShells preserves everything for the playground', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await setupFixture();
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('keepShells does NOT preserve in-file platform marker blocks', async () => {
    // `keepShells` only opts out of *directory* deletion + script
    // pruning. Block-level markers are still applied so the same
    // playground build can demonstrate platform-specific code with
    // the chosen platform's content live in the iframe.
    await stripFeatures(
      dir,
      FLAGS,
      { platform: 'web', layout: 'stacked' },
      { keepShells: true }
    );
    const html = await readFile(path.join(dir, 'index.html'), 'utf8');
    expect(html).not.toContain('apple-mobile-web-app-capable');
  });

  it('keepAllVariantFiles preserves sheet.tsx even when layout != mobile-drawer', async () => {
    // Variant file markers are skipped under this opt-out so the
    // examples showcase can still statically import every preset.
    await stripFeatures(
      dir,
      FLAGS,
      { platform: 'web', layout: 'stacked' },
      { keepAllVariantFiles: true }
    );
    expect(
      existsSync(path.join(dir, 'src', 'shared', 'ui', 'sheet.tsx'))
    ).toBe(true);
  });
});
