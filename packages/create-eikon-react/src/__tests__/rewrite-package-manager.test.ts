import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { rewritePackageManagerFields } from '../rewrite-package-manager.js';

/**
 * Fixture mirroring the shape of the real template's `package.json`,
 * trimmed to the fields this module touches. Real templates carry many
 * more keys; the rewriter must leave them untouched.
 */
const TEMPLATE_PKG = {
  name: '@eikon/react',
  private: true,
  version: '2.0.0',
  type: 'module',
  engines: {
    node: '>=20.10.0',
    pnpm: '>=9.0.0',
  },
  packageManager: 'pnpm@9.12.0',
  scripts: {
    dev: 'vite',
    build: 'vite build',
    typecheck: 'tsc -b --noEmit',
    check: 'pnpm run typecheck && pnpm run lint && pnpm run test',
    ci: 'pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build',
  },
  dependencies: { react: '^19.0.0' },
};

async function withTmpPkg<T>(
  pkg: object,
  body: (dir: string, pkgPath: string) => Promise<T>
): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'eikon-rwpm-'));
  try {
    const pkgPath = path.join(dir, 'package.json');
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    return await body(dir, pkgPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function readJson(p: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(p, 'utf8')) as Record<string, unknown>;
}

describe('rewritePackageManagerFields', () => {
  it('is a no-op when pm = pnpm (template is already pnpm-flavoured)', async () => {
    await withTmpPkg(TEMPLATE_PKG, async (dir, pkgPath) => {
      const before = await readFile(pkgPath, 'utf8');
      await rewritePackageManagerFields(dir, 'pnpm');
      const after = await readFile(pkgPath, 'utf8');
      // Byte-identical: the rewriter must not even re-serialise the
      // file when the chosen PM matches the template's flavour.
      expect(after).toBe(before);
    });
  });

  it('rewrites engines / packageManager / scripts for npm', async () => {
    await withTmpPkg(TEMPLATE_PKG, async (dir, pkgPath) => {
      await rewritePackageManagerFields(dir, 'npm');
      const pkg = (await readJson(pkgPath)) as typeof TEMPLATE_PKG;

      // engines: pnpm pin gone, npm pin added, node preserved.
      expect(pkg.engines).toEqual({ node: '>=20.10.0', npm: '>=10.0.0' });

      // packageManager: corepack-style spec for npm.
      expect(pkg.packageManager).toMatch(/^npm@\d+\.\d+\.\d+$/);

      // scripts: aggregate scripts now use `npm run`. Non-aggregate
      // scripts (`dev`, `build`, `typecheck`) stay byte-identical
      // because they don't shell out to `pnpm`.
      expect(pkg.scripts.dev).toBe('vite');
      expect(pkg.scripts.typecheck).toBe('tsc -b --noEmit');
      expect(pkg.scripts.check).toBe(
        'npm run typecheck && npm run lint && npm run test'
      );
      expect(pkg.scripts.ci).toBe(
        'npm run typecheck && npm run lint && npm run test && npm run build'
      );

      // Other top-level fields untouched.
      expect(pkg.name).toBe('@eikon/react');
      expect(pkg.dependencies).toEqual({ react: '^19.0.0' });
    });
  });

  it('rewrites engines / packageManager / scripts for bun', async () => {
    await withTmpPkg(TEMPLATE_PKG, async (dir, pkgPath) => {
      await rewritePackageManagerFields(dir, 'bun');
      const pkg = (await readJson(pkgPath)) as typeof TEMPLATE_PKG;

      expect(pkg.engines).toEqual({ node: '>=20.10.0', bun: '>=1.1.0' });
      expect(pkg.packageManager).toMatch(/^bun@\d+\.\d+\.\d+$/);
      expect(pkg.scripts.check).toBe(
        'bun run typecheck && bun run lint && bun run test'
      );
      expect(pkg.scripts.ci).toBe(
        'bun run typecheck && bun run lint && bun run test && bun run build'
      );
    });
  });

  it('does NOT touch `pnpm --filter ...` scripts (workspace-only, pnpm-required)', async () => {
    // Even though resolvePackageManager snaps --pm to pnpm on
    // desktop/mobile, defend in depth: the rewriter itself must leave
    // workspace-filter scripts alone so a future caller doesn't
    // silently corrupt them.
    const pkgWithFilter = {
      ...TEMPLATE_PKG,
      scripts: {
        ...TEMPLATE_PKG.scripts,
        tauri: 'pnpm --filter "./apps/desktop" tauri',
        cap: 'pnpm --filter "./apps/mobile" cap',
      },
    };
    await withTmpPkg(pkgWithFilter, async (dir, pkgPath) => {
      await rewritePackageManagerFields(dir, 'npm');
      const pkg = (await readJson(pkgPath)) as typeof pkgWithFilter;
      expect(pkg.scripts.tauri).toBe('pnpm --filter "./apps/desktop" tauri');
      expect(pkg.scripts.cap).toBe('pnpm --filter "./apps/mobile" cap');
    });
  });

  it('silently no-ops when package.json is missing', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'eikon-rwpm-empty-'));
    try {
      // No package.json written — must not throw.
      await rewritePackageManagerFields(dir, 'npm');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('preserves trailing newline on the rewritten file', async () => {
    await withTmpPkg(TEMPLATE_PKG, async (dir, pkgPath) => {
      await rewritePackageManagerFields(dir, 'npm');
      const raw = await readFile(pkgPath, 'utf8');
      expect(raw.endsWith('\n')).toBe(true);
    });
  });
});
