import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyUiSnapshot,
  getSnapshotDir,
  isReplaceableUiFile,
  listSnapshotFiles,
  readSnapshotDeps,
  readSnapshotFile,
  REPLACEABLE_UI_FILES,
} from '../apply-ui-snapshot.js';

/**
 * Fixture builder: writes a fake snapshot dir + a fake project dir that
 * together exercise everything `applyUiSnapshot` does on disk. Returns
 * absolute paths to both.
 */
async function setupFixture(): Promise<{
  root: string;
  projectDir: string;
  snapshotsRoot: string;
  cleanup: () => Promise<void>;
}> {
  const root = await mkdtemp(path.join(tmpdir(), 'apply-ui-snapshot-'));
  const projectDir = path.join(root, 'project');
  const snapshotsRoot = path.join(root, 'template-snapshots');
  await mkdir(projectDir, { recursive: true });
  await mkdir(snapshotsRoot, { recursive: true });

  // Project's stock src/shared/ui/* (the seven replaceable files plus
  // two sticky ones that must survive).
  const projectUi = path.join(projectDir, 'src', 'shared', 'ui');
  await mkdir(projectUi, { recursive: true });
  for (const name of REPLACEABLE_UI_FILES) {
    await writeFile(
      path.join(projectUi, name),
      `// project-authored ${name}\n`,
      'utf8'
    );
  }
  await writeFile(
    path.join(projectUi, 'theme-toggle.tsx'),
    '// theme-toggle.tsx (sticky, owned by template)\n',
    'utf8'
  );
  await writeFile(
    path.join(projectUi, 'language-switcher.tsx'),
    '// language-switcher.tsx (sticky, owned by template)\n',
    'utf8'
  );

  // Project's package.json starts with one dep + one devDep so the merge
  // path can be observed adding to (not replacing) what's already there.
  await writeFile(
    path.join(projectDir, 'package.json'),
    JSON.stringify(
      {
        name: 'project',
        version: '0.0.0',
        dependencies: { existing: '^1.0.0' },
        devDependencies: { 'existing-dev': '^2.0.0' },
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  return {
    root,
    projectDir,
    snapshotsRoot,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

async function writeSnapshot(
  snapshotsRoot: string,
  ui: 'shadcn' | 'animate-ui',
  files: Record<string, string>,
  deps?: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
): Promise<void> {
  const dir = path.join(snapshotsRoot, ui);
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content, 'utf8');
  }
  if (deps) {
    await writeFile(
      path.join(dir, 'package-deps.json'),
      JSON.stringify(deps, null, 2) + '\n',
      'utf8'
    );
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

describe('isReplaceableUiFile', () => {
  it('returns true for the seven owned UI primitives', () => {
    for (const name of REPLACEABLE_UI_FILES) {
      expect(isReplaceableUiFile(`src/shared/ui/${name}`)).toBe(true);
    }
  });

  it('returns false for siblings that are NOT owned by the snapshot', () => {
    expect(isReplaceableUiFile('src/shared/ui/theme-toggle.tsx')).toBe(false);
    expect(isReplaceableUiFile('src/shared/ui/language-switcher.tsx')).toBe(false);
    expect(isReplaceableUiFile('src/shared/ui/some-future-file.tsx')).toBe(false);
  });

  it('returns false when the path is not under src/shared/ui/', () => {
    expect(isReplaceableUiFile('src/features/auth/Button.tsx')).toBe(false);
    expect(isReplaceableUiFile('button.tsx')).toBe(false);
  });
});

describe('getSnapshotDir', () => {
  it('returns null for the custom variant', () => {
    expect(getSnapshotDir('custom', '/anywhere')).toBeNull();
  });

  it('returns null for unknown values', () => {
    expect(getSnapshotDir('bogus', '/anywhere')).toBeNull();
  });

  it('returns the joined path for shadcn / animate-ui', () => {
    expect(getSnapshotDir('shadcn', '/snapshots')).toBe(
      path.join('/snapshots', 'shadcn')
    );
    expect(getSnapshotDir('animate-ui', '/snapshots')).toBe(
      path.join('/snapshots', 'animate-ui')
    );
  });
});

describe('applyUiSnapshot', () => {
  let fx: Awaited<ReturnType<typeof setupFixture>>;

  beforeEach(async () => {
    fx = await setupFixture();
  });

  afterEach(async () => {
    await fx.cleanup();
  });

  it('is a no-op for ui=custom', async () => {
    await applyUiSnapshot(fx.projectDir, 'custom', fx.snapshotsRoot);
    // All seven replaceable files survive untouched.
    for (const name of REPLACEABLE_UI_FILES) {
      const text = await readFile(
        path.join(fx.projectDir, 'src/shared/ui', name),
        'utf8'
      );
      expect(text).toContain('project-authored');
    }
    // No components.json was added.
    expect(
      await pathExists(path.join(fx.projectDir, 'components.json'))
    ).toBe(false);
  });

  it('throws on unknown ui values', async () => {
    await expect(
      applyUiSnapshot(fx.projectDir, 'totally-fake', fx.snapshotsRoot)
    ).rejects.toThrow(/unknown ui variant/);
  });

  it('throws when the snapshot dir is missing', async () => {
    // We've intentionally not created template-snapshots/shadcn yet.
    await expect(
      applyUiSnapshot(fx.projectDir, 'shadcn', fx.snapshotsRoot)
    ).rejects.toThrow(/missing snapshot directory/);
  });

  it('falls back to no-op when the snapshot dir exists but ships no UI files', async () => {
    // Empty snapshot — only metadata, no replaceable UI files. This
    // matches the state animate-ui's snapshot is in before the
    // maintainer runs `pnpm sync-ui-snapshots`. Owned UI files should
    // survive untouched and components.json should NOT be written
    // (keeping the project shape consistent with `--ui custom`).
    // The fallback must be loud — silent would leave users thinking
    // their `--ui animate-ui` flag had effect when it didn't.
    await writeSnapshot(fx.snapshotsRoot, 'animate-ui', {
      'package-deps.json': '{}\n',
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      await applyUiSnapshot(fx.projectDir, 'animate-ui', fx.snapshotsRoot);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]![0]).toMatch(
        /`--ui animate-ui` snapshot.*ships no UI primitives.*falling back/
      );
    } finally {
      warn.mockRestore();
    }
    for (const name of REPLACEABLE_UI_FILES) {
      const text = await readFile(
        path.join(fx.projectDir, 'src/shared/ui', name),
        'utf8'
      );
      expect(text).toContain('project-authored');
    }
    expect(
      await pathExists(path.join(fx.projectDir, 'components.json'))
    ).toBe(false);
  });

  it('replaces the seven owned files, keeps theme-toggle / language-switcher', async () => {
    await writeSnapshot(fx.snapshotsRoot, 'shadcn', {
      'src/shared/ui/button.tsx': '// shadcn button\n',
      'src/shared/ui/dialog.tsx': '// shadcn dialog\n',
      'src/shared/ui/tabs.tsx': '// shadcn tabs\n',
      'src/shared/ui/sheet.tsx': '// shadcn sheet\n',
      'src/shared/ui/command.tsx': '// shadcn command\n',
      'src/shared/ui/card.tsx': '// shadcn card\n',
      'src/shared/ui/toaster.tsx': '// shadcn toaster\n',
    });

    await applyUiSnapshot(fx.projectDir, 'shadcn', fx.snapshotsRoot);

    for (const name of REPLACEABLE_UI_FILES) {
      const text = await readFile(
        path.join(fx.projectDir, 'src/shared/ui', name),
        'utf8'
      );
      expect(text).toBe(`// shadcn ${name.replace('.tsx', '')}\n`);
    }
    // Sticky files survive.
    const themeToggle = await readFile(
      path.join(fx.projectDir, 'src/shared/ui/theme-toggle.tsx'),
      'utf8'
    );
    expect(themeToggle).toContain('theme-toggle.tsx (sticky');
    const languageSwitcher = await readFile(
      path.join(fx.projectDir, 'src/shared/ui/language-switcher.tsx'),
      'utf8'
    );
    expect(languageSwitcher).toContain('language-switcher.tsx (sticky');
  });

  it('writes components.json at project root when the snapshot ships one', async () => {
    await writeSnapshot(fx.snapshotsRoot, 'animate-ui', {
      'src/shared/ui/button.tsx': '// animate button\n',
      'components.json': JSON.stringify({ aliases: { ui: '@/shared/ui' } }) + '\n',
    });

    await applyUiSnapshot(fx.projectDir, 'animate-ui', fx.snapshotsRoot);

    const componentsJson = await readFile(
      path.join(fx.projectDir, 'components.json'),
      'utf8'
    );
    expect(JSON.parse(componentsJson)).toEqual({
      aliases: { ui: '@/shared/ui' },
    });
  });

  it('copies extra src/ files the snapshot ships (e.g. animate-ui hooks)', async () => {
    await writeSnapshot(fx.snapshotsRoot, 'animate-ui', {
      'src/shared/ui/tabs.tsx': '// animate tabs\n',
      'src/hooks/use-something.ts': '// extra animate-ui hook\n',
    });

    await applyUiSnapshot(fx.projectDir, 'animate-ui', fx.snapshotsRoot);

    const hook = await readFile(
      path.join(fx.projectDir, 'src/hooks/use-something.ts'),
      'utf8'
    );
    expect(hook).toContain('extra animate-ui hook');
  });

  it('merges package-deps.json into package.json (additive, snapshot wins on overlap)', async () => {
    await writeSnapshot(
      fx.snapshotsRoot,
      'animate-ui',
      {
        'src/shared/ui/button.tsx': '// animate button\n',
      },
      {
        dependencies: {
          motion: '^11.0.0',
          existing: '^9.9.9', // overlaps with project's pin
          '@radix-ui/react-tabs': '^1.0.0',
        },
        devDependencies: {
          'snapshot-dev': '^3.0.0',
        },
      }
    );

    await applyUiSnapshot(fx.projectDir, 'animate-ui', fx.snapshotsRoot);

    const pkg = JSON.parse(
      await readFile(path.join(fx.projectDir, 'package.json'), 'utf8')
    );
    expect(pkg.dependencies).toEqual({
      '@radix-ui/react-tabs': '^1.0.0',
      existing: '^9.9.9', // snapshot won
      motion: '^11.0.0',
    });
    // Deps are sorted alphabetically.
    expect(Object.keys(pkg.dependencies)).toEqual(
      Object.keys(pkg.dependencies).sort()
    );
    expect(pkg.devDependencies).toEqual({
      'existing-dev': '^2.0.0',
      'snapshot-dev': '^3.0.0',
    });
  });

  it('skips snapshot UI files when no project counterpart survived strip', async () => {
    // applyUiSnapshot mirrors `stripFeatures`: it only restores
    // snapshot primitives whose project counterpart was kept by the
    // strip pass. Removing `src/` simulates a project where every
    // primitive was stripped (degenerate case — the real CLI always
    // copies the template tree first), so the snapshot must NOT
    // resurrect dead code that has no callers.
    await rm(path.join(fx.projectDir, 'src'), {
      recursive: true,
      force: true,
    });
    await writeSnapshot(fx.snapshotsRoot, 'shadcn', {
      'src/shared/ui/button.tsx': '// shadcn button\n',
    });

    await applyUiSnapshot(fx.projectDir, 'shadcn', fx.snapshotsRoot);

    await expect(
      stat(path.join(fx.projectDir, 'src/shared/ui/button.tsx'))
    ).rejects.toThrow();
  });
});

describe('listSnapshotFiles / readSnapshotFile / readSnapshotDeps (simulator helpers)', () => {
  let fx: Awaited<ReturnType<typeof setupFixture>>;

  beforeEach(async () => {
    fx = await setupFixture();
  });

  afterEach(async () => {
    await fx.cleanup();
  });

  it('listSnapshotFiles returns POSIX paths and skips package-deps.json', async () => {
    await writeSnapshot(
      fx.snapshotsRoot,
      'shadcn',
      {
        'src/shared/ui/button.tsx': '// b\n',
        'src/shared/ui/dialog.tsx': '// d\n',
        'components.json': '{}\n',
      },
      { dependencies: { foo: '1.0.0' } }
    );

    const files = await listSnapshotFiles('shadcn', fx.snapshotsRoot);
    expect(files).toEqual([
      'components.json',
      'src/shared/ui/button.tsx',
      'src/shared/ui/dialog.tsx',
    ]);
  });

  it('listSnapshotFiles returns [] for ui=custom and unknown', async () => {
    expect(await listSnapshotFiles('custom', fx.snapshotsRoot)).toEqual([]);
    expect(await listSnapshotFiles('bogus', fx.snapshotsRoot)).toEqual([]);
  });

  it('listSnapshotFiles returns [] when the snapshot dir does not exist', async () => {
    expect(await listSnapshotFiles('shadcn', fx.snapshotsRoot)).toEqual([]);
  });

  it('readSnapshotFile returns content for known files, null for missing', async () => {
    await writeSnapshot(fx.snapshotsRoot, 'animate-ui', {
      'src/shared/ui/button.tsx': '// animate button\n',
    });

    expect(
      await readSnapshotFile(
        'animate-ui',
        'src/shared/ui/button.tsx',
        fx.snapshotsRoot
      )
    ).toBe('// animate button\n');

    expect(
      await readSnapshotFile('animate-ui', 'nope.tsx', fx.snapshotsRoot)
    ).toBeNull();

    expect(
      await readSnapshotFile(
        'custom',
        'src/shared/ui/button.tsx',
        fx.snapshotsRoot
      )
    ).toBeNull();
  });

  it('readSnapshotDeps returns empty for missing / custom', async () => {
    expect(await readSnapshotDeps('custom', fx.snapshotsRoot)).toEqual({
      dependencies: {},
      devDependencies: {},
    });
    expect(await readSnapshotDeps('shadcn', fx.snapshotsRoot)).toEqual({
      dependencies: {},
      devDependencies: {},
    });
  });

  it('readSnapshotDeps returns the parsed deps when present', async () => {
    await writeSnapshot(
      fx.snapshotsRoot,
      'animate-ui',
      {
        'src/shared/ui/button.tsx': '// animate\n',
      },
      {
        dependencies: { motion: '^11.0.0' },
        devDependencies: { dev: '^1.0.0' },
      }
    );
    expect(await readSnapshotDeps('animate-ui', fx.snapshotsRoot)).toEqual({
      dependencies: { motion: '^11.0.0' },
      devDependencies: { dev: '^1.0.0' },
    });
  });
});
