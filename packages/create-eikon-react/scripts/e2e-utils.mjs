// Process / IO / CLI-arg primitives for the create-eikon-react e2e harness
// (scripts/e2e.mjs). These are leaf helpers with no dependency on the
// orchestration state — split out so e2e.mjs reads as the high-level flow
// (build → pack → install → run → verify) rather than a mix of flow and
// plumbing. Behaviour is unchanged from the inlined versions.

import { spawn } from 'node:child_process';
import path from 'node:path';

// Per-pm install args. `--prefer-offline` is only safe for pnpm here:
// pnpm's metadata cache is auto-refreshed by every workspace install in
// this monorepo, so it's never stale. npm's cache lifetime is governed
// by `cache-min` and routinely lags behind the registry — using
// `--prefer-offline` there causes intermittent "no matching version"
// errors against legitimately-published deps. bun has no equivalent
// flag (it owns its global cache).
export const PM_INSTALL_ARGS = {
  pnpm: [
    'install',
    '--prefer-offline',
    // Windows MAX_PATH (260) guard, win32 only. The animate-ui scenario's
    // dependency graph produces pnpm virtual-store dir names
    // (`.pnpm/<pkg>@<ver>_<peer-hashes…>`) ~115 chars long; the deepest files
    // beneath them (@typescript-eslint dist, react-i18next) then cross 260 on
    // runners without long-path support. pnpm can't fully materialise the
    // tree there, so e.g. react-i18next's `html-parse-stringify` link goes
    // missing and the generated project's vitest fails to resolve it at
    // collection time. Truncating the virtual-store dir names (hash-suffixed,
    // collision-safe) keeps every path well under 260 regardless of the
    // runner's LongPathsEnabled. It only renames on-disk dirs — the resolved
    // graph is identical — and is harmless on POSIX, so we scope it to win32
    // to leave the Linux e2e at full default fidelity.
    ...(process.platform === 'win32'
      ? ['--config.virtual-store-dir-max-length=50']
      : []),
  ],
  npm: ['install'],
  bun: ['install'],
};

/**
 * Probe whether a CLI is on PATH by running `<cmd> --version`. Used to
 * gracefully skip the install/build phase for `pm-bun` on machines where
 * bun isn't installed — the scaffold + tree verification still runs and
 * is the part of the test that's actually pm-specific. pnpm and npm are
 * both prerequisites of this monorepo so we don't bother probing them.
 */
export function commandExists(cmd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, ['--version'], {
      stdio: 'ignore',
      shell: process.platform === 'win32',
    });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

export async function packCli(cliDir, tmpDir) {
  const before = new Set(await listTarballs(tmpDir));
  await run('npm', ['pack', '--pack-destination', tmpDir, '--silent'], cliDir);
  const after = await listTarballs(tmpDir);
  const created = after.find((f) => !before.has(f));
  if (!created) throw new Error('npm pack did not produce a tarball');
  return path.join(tmpDir, created);
}

async function listTarballs(dir) {
  const { readdir } = await import('node:fs/promises');
  try {
    return (await readdir(dir)).filter((f) => f.endsWith('.tgz'));
  } catch {
    return [];
  }
}

export function run(cmd, cliArgs, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cliArgs, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, CI: '1' },
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${cliArgs.join(' ')} exited with ${code}`));
    });
  });
}

export async function writeJson(filePath, obj) {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

export function step(label) {
  console.log(`[e2e] ${label}`);
}

export function parseArgs(argv) {
  const out = { quick: false, keep: false, only: null, concurrency: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--quick') out.quick = true;
    else if (a === '--keep') out.keep = true;
    else if (a === '--only') {
      const next = argv[++i];
      if (!next) throw new Error('--only requires a value');
      out.only = next.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (a.startsWith('--only=')) {
      out.only = a
        .slice('--only='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (a === '--concurrency') {
      const next = argv[++i];
      if (!next) throw new Error('--concurrency requires a value');
      const n = Number.parseInt(next, 10);
      if (!Number.isFinite(n) || n < 1) {
        throw new Error(`--concurrency must be a positive integer (got "${next}")`);
      }
      out.concurrency = n;
    } else if (a.startsWith('--concurrency=')) {
      const v = a.slice('--concurrency='.length);
      const n = Number.parseInt(v, 10);
      if (!Number.isFinite(n) || n < 1) {
        throw new Error(`--concurrency must be a positive integer (got "${v}")`);
      }
      out.concurrency = n;
    }
  }
  return out;
}

/**
 * Run `task(item)` for every item in `items`, with at most `concurrency`
 * tasks in flight at once. Resolves when all complete; rejects on the
 * first failure (and waits for in-flight tasks to settle so their stdio
 * doesn't keep landing after the script exits).
 */
export async function runWithConcurrency(items, concurrency, task) {
  const queue = [...items];
  const errors = [];
  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      try {
        await task(item);
      } catch (e) {
        errors.push(e);
        // Drain remaining items so the worker pool empties promptly,
        // but skip executing them — fail-fast semantics with clean
        // stdio on the way out.
        queue.length = 0;
        return;
      }
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  if (errors.length > 0) {
    throw errors[0];
  }
}
