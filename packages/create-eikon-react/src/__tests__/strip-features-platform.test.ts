/**
 * @file strip-features-platform.test.ts
 * @description Pinpoint coverage for the `platform` axis behaviour added
 * to `stripFeatures` — directory-level removal of `apps/desktop/` /
 * `apps/mobile/` shells, and the `prunePackageScripts` pass that drops
 * `tauri:*` / `cap:*` from `package.json` based on the chosen platform.
 *
 * Uses an in-memory fixture (a temp dir with the exact apps/ layout we
 * ship in the template) so failures point at the strip rule, not at the
 * real template's evolving contents.
 */

// =================================================================================================
// Imports
// =================================================================================================

import { existsSync } from 'node:fs';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  prunePackageScripts,
  prunePlatformOnlyRootFiles,
  stripFeatures,
} from '../strip-features.js';

// =================================================================================================
// Fixture
// =================================================================================================

const FLAGS = { supabase: false } as const;

/**
 * Build a temp directory containing the four files that participate in
 * platform stripping. The shapes mirror the real template (apps/desktop
 * has a Cargo.toml + a package.json, apps/mobile has a capacitor.config
 * + a package.json) so the directory removal walks the same edges as
 * the real strip.
 */
async function setupFixture(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'eikon-platform-'));

  await writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'fixture',
        scripts: {
          build: 'vite build',
          'tauri:dev': 'pnpm --filter desktop dev',
          'tauri:build': 'pnpm --filter desktop build',
          tauri: 'pnpm --filter desktop tauri',
          'cap:sync': 'pnpm --filter mobile sync',
          'cap:add:ios': 'pnpm --filter mobile add:ios',
          'cap:add:android': 'pnpm --filter mobile add:android',
          cap: 'pnpm --filter mobile cap',
        },
        dependencies: { react: '19.0.0' },
      },
      null,
      2
    ) + '\n'
  );

  // apps/desktop tree
  const desktop = path.join(dir, 'apps', 'desktop');
  await mkdir(path.join(desktop, 'src-tauri', 'src'), { recursive: true });
  await writeFile(
    path.join(desktop, 'package.json'),
    JSON.stringify({ name: 'desktop' }) + '\n'
  );
  await writeFile(
    path.join(desktop, 'src-tauri', 'Cargo.toml'),
    '[package]\nname = "app"\n'
  );
  await writeFile(
    path.join(desktop, 'src-tauri', 'src', 'main.rs'),
    'fn main() {}\n'
  );

  // apps/mobile tree
  const mobile = path.join(dir, 'apps', 'mobile');
  await mkdir(mobile, { recursive: true });
  await writeFile(
    path.join(mobile, 'package.json'),
    JSON.stringify({ name: 'mobile' }) + '\n'
  );
  await writeFile(
    path.join(mobile, 'capacitor.config.ts'),
    'export default {};\n'
  );

  // pnpm-workspace.yaml — declares apps/* and is platform-only.
  // The fixture intentionally mirrors the production yaml so the
  // strip rule sees the same shape it ships against.
  await writeFile(
    path.join(dir, 'pnpm-workspace.yaml'),
    'packages:\n  - "apps/*"\n'
  );

  return dir;
}

// =================================================================================================
// Tests — directory removal
// =================================================================================================

describe('stripFeatures — platform shell directories', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await setupFixture();
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('platform=web removes BOTH apps/desktop and apps/mobile', async () => {
    await stripFeatures(dir, FLAGS, { platform: 'web' });
    expect(existsSync(path.join(dir, 'apps', 'desktop'))).toBe(false);
    expect(existsSync(path.join(dir, 'apps', 'mobile'))).toBe(false);
  });

  it('platform=desktop keeps apps/desktop, removes apps/mobile', async () => {
    await stripFeatures(dir, FLAGS, { platform: 'desktop' });
    expect(existsSync(path.join(dir, 'apps', 'desktop'))).toBe(true);
    expect(
      existsSync(path.join(dir, 'apps', 'desktop', 'src-tauri', 'Cargo.toml'))
    ).toBe(true);
    expect(existsSync(path.join(dir, 'apps', 'mobile'))).toBe(false);
  });

  it('platform=mobile keeps apps/mobile, removes apps/desktop', async () => {
    await stripFeatures(dir, FLAGS, { platform: 'mobile' });
    expect(existsSync(path.join(dir, 'apps', 'mobile'))).toBe(true);
    expect(
      existsSync(path.join(dir, 'apps', 'mobile', 'capacitor.config.ts'))
    ).toBe(true);
    expect(existsSync(path.join(dir, 'apps', 'desktop'))).toBe(false);
  });

  it('keepShells: true preserves both apps/* regardless of platform', async () => {
    // The preview-site uses this opt-out so a single cache entry can
    // serve every platform. Asserting it works on the desktop value
    // (where the apps/mobile dir would normally be removed) is the
    // strictest test — proves the option fully shadows the default rule.
    await stripFeatures(
      dir,
      FLAGS,
      { platform: 'desktop' },
      { keepShells: true }
    );
    expect(existsSync(path.join(dir, 'apps', 'desktop'))).toBe(true);
    expect(existsSync(path.join(dir, 'apps', 'mobile'))).toBe(true);
    // keepShells also disables the platform-only root-file pruning
    // (so the workspace yaml stays intact for the playground).
    expect(existsSync(path.join(dir, 'pnpm-workspace.yaml'))).toBe(true);
  });
});

// =================================================================================================
// Tests — prunePlatformOnlyRootFiles
// =================================================================================================

describe('prunePlatformOnlyRootFiles', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await setupFixture();
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('platform=web removes pnpm-workspace.yaml (apps/* glob is dead without shells)', async () => {
    await prunePlatformOnlyRootFiles(dir, { platform: 'web' });
    expect(existsSync(path.join(dir, 'pnpm-workspace.yaml'))).toBe(false);
  });

  it('platform=desktop keeps pnpm-workspace.yaml (tauri:* needs the workspace filter)', async () => {
    await prunePlatformOnlyRootFiles(dir, { platform: 'desktop' });
    expect(existsSync(path.join(dir, 'pnpm-workspace.yaml'))).toBe(true);
  });

  it('platform=mobile keeps pnpm-workspace.yaml (cap:* needs the workspace filter)', async () => {
    await prunePlatformOnlyRootFiles(dir, { platform: 'mobile' });
    expect(existsSync(path.join(dir, 'pnpm-workspace.yaml'))).toBe(true);
  });

  it('no-op when platform is missing', async () => {
    await prunePlatformOnlyRootFiles(dir, {});
    expect(existsSync(path.join(dir, 'pnpm-workspace.yaml'))).toBe(true);
  });

  it('safe to call when target file is already absent', async () => {
    await rm(path.join(dir, 'pnpm-workspace.yaml'), { force: true });
    await expect(
      prunePlatformOnlyRootFiles(dir, { platform: 'web' })
    ).resolves.toBeUndefined();
  });

  it('stripFeatures wires the helper end-to-end', async () => {
    // End-to-end check: the public `stripFeatures` entry point must
    // call `prunePlatformOnlyRootFiles` so callers (CLI, e2e) don't
    // have to wire it themselves.
    await stripFeatures(dir, FLAGS, { platform: 'web' });
    expect(existsSync(path.join(dir, 'pnpm-workspace.yaml'))).toBe(false);
  });
});

// =================================================================================================
// Tests — prunePackageScripts
// =================================================================================================

describe('prunePackageScripts', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await setupFixture();
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('platform=web drops both tauri:* and cap:* scripts', async () => {
    await prunePackageScripts(dir, { platform: 'web' });
    const pkg = JSON.parse(
      await readFile(path.join(dir, 'package.json'), 'utf8')
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts!['tauri']).toBeUndefined();
    expect(pkg.scripts!['tauri:dev']).toBeUndefined();
    expect(pkg.scripts!['tauri:build']).toBeUndefined();
    expect(pkg.scripts!['cap']).toBeUndefined();
    expect(pkg.scripts!['cap:sync']).toBeUndefined();
    expect(pkg.scripts!['cap:add:ios']).toBeUndefined();
    expect(pkg.scripts!['cap:add:android']).toBeUndefined();
    // Unrelated scripts survive — this is feature-scoped pruning.
    expect(pkg.scripts!['build']).toBe('vite build');
  });

  it('platform=desktop keeps tauri:*, drops cap:*', async () => {
    await prunePackageScripts(dir, { platform: 'desktop' });
    const pkg = JSON.parse(
      await readFile(path.join(dir, 'package.json'), 'utf8')
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts!['tauri:dev']).toBeDefined();
    expect(pkg.scripts!['tauri:build']).toBeDefined();
    expect(pkg.scripts!['cap:sync']).toBeUndefined();
    expect(pkg.scripts!['cap:add:ios']).toBeUndefined();
  });

  it('platform=mobile keeps cap:*, drops tauri:*', async () => {
    await prunePackageScripts(dir, { platform: 'mobile' });
    const pkg = JSON.parse(
      await readFile(path.join(dir, 'package.json'), 'utf8')
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts!['cap:sync']).toBeDefined();
    expect(pkg.scripts!['cap:add:ios']).toBeDefined();
    expect(pkg.scripts!['cap:add:android']).toBeDefined();
    expect(pkg.scripts!['tauri:dev']).toBeUndefined();
    expect(pkg.scripts!['tauri:build']).toBeUndefined();
  });

  it('no-op when platform is missing (backward compat with feature-only callers)', async () => {
    const before = await readFile(path.join(dir, 'package.json'), 'utf8');
    await prunePackageScripts(dir, {});
    const after = await readFile(path.join(dir, 'package.json'), 'utf8');
    expect(after).toBe(before);
  });
});
