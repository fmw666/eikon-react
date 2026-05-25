// Post-publish smoke test for create-eikon-react.
//
// Distinct from scripts/e2e.mjs: e2e runs the LOCAL build via `npm pack` to
// verify the tarball would scaffold correctly. smoke pulls the ACTUAL
// PUBLISHED package via `npm install <pkg>@<ver> --registry=<official>`,
// which catches publish-only issues that local pack misses — npm CDN
// serving a stale tarball, the bin shim not surviving the registry round
// trip, .npmrc routing to a mirror, etc.
//
// Usage:
//   node scripts/smoke.mjs                  # version from package.json, fast
//   pnpm smoke                              # same
//   node scripts/smoke.mjs --version 1.0.0  # specific version
//   node scripts/smoke.mjs --full           # + pnpm install/typecheck/build
//   node scripts/smoke.mjs --keep           # leave sandbox on disk

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_DIR = path.resolve(__dirname, '..');

// Always hit the official registry, ignoring the dev's global .npmrc.
// A developer with registry=https://registry.npmmirror.com would otherwise
// be smoke-testing the mirror's cached copy instead of what we just pushed.
const NPMJS = 'https://registry.npmjs.org/';
const PKG_NAME = 'create-eikon-react';

const args = parseArgs(process.argv.slice(2));

main().catch((err) => {
  console.error('[smoke] FAILED:', err.message ?? err);
  process.exit(1);
});

async function main() {
  const version = args.version ?? (await readLocalVersion());
  console.log(`[smoke] target:   ${PKG_NAME}@${version}`);
  console.log(`[smoke] mode:     ${args.full ? 'full (install/typecheck/build)' : 'fast'}`);
  console.log(`[smoke] registry: ${NPMJS}\n`);

  step(`Verify ${PKG_NAME}@${version} exists on registry`);
  await verifyPublished(version);

  const tmp = await mkdtemp(path.join(tmpdir(), 'eikon-smoke-'));
  console.log(`[smoke] sandbox:  ${tmp}`);

  try {
    step('Install published package into sandbox');
    await writeJson(path.join(tmp, 'package.json'), {
      name: 'eikon-smoke-sandbox',
      version: '0.0.0',
      private: true,
    });
    await run(
      'npm',
      [
        'install',
        '--no-save',
        '--silent',
        `--registry=${NPMJS}`,
        `${PKG_NAME}@${version}`,
      ],
      tmp,
    );

    const cliBin = path.join(
      tmp,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? `${PKG_NAME}.cmd` : PKG_NAME,
    );
    if (!existsSync(cliBin)) {
      throw new Error(`bin shim not found post-install: ${cliBin}`);
    }

    step('Invoke CLI (web, default variants, --no-install --no-git)');
    const projectName = 'smoke-app';
    await run(
      cliBin,
      [
        projectName,
        '--yes',
        '--no-supabase',
        '--no-install',
        '--no-git',
        '--pm',
        'pnpm',
      ],
      tmp,
    );

    const projectDir = path.join(tmp, projectName);
    if (!existsSync(projectDir)) {
      throw new Error(`CLI did not create ${projectDir}`);
    }

    step('Spot-check generated tree');
    await spotCheck(projectDir, projectName);

    if (args.full) {
      step('pnpm install (in generated project)');
      await run('pnpm', ['install', '--prefer-offline'], projectDir);
      step('pnpm typecheck');
      await run('pnpm', ['typecheck'], projectDir);
      step('pnpm build');
      await run('pnpm', ['build'], projectDir);
    }

    console.log(`\n[smoke] PASSED — ${PKG_NAME}@${version} scaffolds cleanly.`);
  } finally {
    if (args.keep) {
      console.log(`[smoke] --keep: leaving ${tmp} on disk`);
    } else {
      await rm(tmp, { recursive: true, force: true }).catch(() => {});
    }
  }
}

async function readLocalVersion() {
  const pkg = JSON.parse(
    await readFile(path.join(CLI_DIR, 'package.json'), 'utf8'),
  );
  return pkg.version;
}

// npm's CDN lags a few seconds behind a successful publish. Retry a few
// times so a smoke run kicked off immediately after `npm publish` doesn't
// false-fail on metadata that hasn't propagated yet.
async function verifyPublished(version) {
  const attempts = 4;
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const out = await capture('npm', [
        'view',
        `${PKG_NAME}@${version}`,
        'version',
        `--registry=${NPMJS}`,
      ]);
      if (out.trim() === version) return;
      throw new Error(
        `registry returned ${JSON.stringify(out.trim())}, expected ${version}`,
      );
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        const wait = 5000;
        console.log(`        (not ready, retry ${i + 1}/${attempts - 1} in ${wait}ms…)`);
        await sleep(wait);
      }
    }
  }
  throw lastErr;
}

async function spotCheck(projectDir, projectName) {
  const required = [
    'package.json',
    '.gitignore',
    'src/main.tsx',
    'src/App.tsx',
    'index.html',
    'tsconfig.json',
    'vite.config.ts',
  ];
  for (const rel of required) {
    if (!existsSync(path.join(projectDir, rel))) {
      throw new Error(`expected file present: ${rel}`);
    }
  }

  // The placeholder name `_gitignore` MUST get renamed to `.gitignore` by
  // copy-template.ts. This is the single most fragile step in the pipeline
  // (npm strips real .gitignore from tarballs), so assert it explicitly.
  if (existsSync(path.join(projectDir, '_gitignore'))) {
    throw new Error('_gitignore placeholder was not renamed to .gitignore');
  }

  const pkg = JSON.parse(
    await readFile(path.join(projectDir, 'package.json'), 'utf8'),
  );
  if (pkg.name !== projectName) {
    throw new Error(`expected package.json name=${projectName}, got ${pkg.name}`);
  }
  if (pkg.version !== '0.1.0') {
    throw new Error(`expected package.json version=0.1.0, got ${pkg.version}`);
  }
  if (pkg.private !== true) {
    throw new Error('expected package.json private=true');
  }
}

function run(cmd, cliArgs, cwd) {
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

function capture(cmd, cliArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cliArgs, {
      stdio: ['ignore', 'pipe', 'inherit'],
      shell: process.platform === 'win32',
    });
    let buf = '';
    child.stdout.on('data', (d) => (buf += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(buf);
      else reject(new Error(`${cmd} ${cliArgs.join(' ')} exited with ${code}`));
    });
  });
}

async function writeJson(filePath, obj) {
  await writeFile(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function step(label) {
  console.log(`[smoke] ${label}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv) {
  const out = { version: null, full: false, keep: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--full') out.full = true;
    else if (a === '--keep') out.keep = true;
    else if (a === '--version') out.version = argv[++i];
    else if (a.startsWith('--version=')) out.version = a.slice('--version='.length);
  }
  return out;
}
