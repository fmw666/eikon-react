// Profiled verification for the eikon-react monorepo.
//
// The old `pnpm verify` path ran release-grade checks on every local push and
// every PR. That made tiny changes wait on full generated-project e2e, package
// manager installs, network audit, and Windows cleanup. Profiles keep the same
// safety net, but put each check at the right feedback layer:
//
//   fast  -> local pre-push: no network, no generated-project installs
//   pr    -> pull requests: build + scaffold smoke without full e2e
//   full  -> main/release/manual/nightly: the release-grade gauntlet
//
// Usage:
//   pnpm verify:fast
//   pnpm verify:pr
//   pnpm verify:full
//   node scripts/verify.mjs --profile pr

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

const STEP_DEFS = {
  typecheck: { cmd: 'pnpm', args: ['typecheck'] },
  lint: { cmd: 'pnpm', args: ['lint'] },
  test: { cmd: 'pnpm', args: ['test'] },
  audit: {
    cmd: 'pnpm',
    args: [
      'audit',
      '--audit-level=high',
      '--registry=https://registry.npmjs.org/',
    ],
  },
  lockfile: { cmd: 'node', args: ['scripts/check-lockfile.mjs'] },
  build: { cmd: 'pnpm', args: ['build'] },
  'e2e:pr': { cmd: 'pnpm', args: ['e2e:pr'] },
  e2e: { cmd: 'pnpm', args: ['e2e'] },
};

const PROFILES = {
  fast: ['typecheck', 'lint', 'test', 'lockfile'],
  pr: ['typecheck', 'lint', 'test', 'lockfile', 'build', 'e2e:pr'],
  full: ['typecheck', 'test', 'lint', 'audit', 'lockfile', 'build', 'e2e'],
};

const profile = parseProfile(process.argv.slice(2));
const stepNames = PROFILES[profile];
const results = stepNames.map((name) => ({ name, status: 'skipped', ms: 0 }));
const totalStart = Date.now();
let failedAt = -1;

console.log(`[verify] profile: ${profile}`);

for (let i = 0; i < stepNames.length; i++) {
  const name = stepNames[i];
  const step = STEP_DEFS[name];
  banner(`step ${i + 1}/${stepNames.length}: ${name}`);
  const t0 = Date.now();
  let code;
  try {
    code = await run(step.cmd, step.args, REPO_ROOT);
  } catch (err) {
    console.error(`[verify] spawn error: ${err.message}`);
    code = -1;
  }
  const ms = Date.now() - t0;
  results[i].ms = ms;
  if (code === 0) {
    results[i].status = 'passed';
    console.log(
      `[verify] step ${i + 1}/${stepNames.length}: ${name} - PASSED in ${formatMs(ms)}\n`
    );
  } else {
    results[i].status = 'failed';
    results[i].exit = code;
    failedAt = i;
    console.error(
      `[verify] step ${i + 1}/${stepNames.length}: ${name} - FAILED (exit ${code}) after ${formatMs(ms)}\n`
    );
    break;
  }
}

const totalMs = Date.now() - totalStart;
printSummary(results, totalMs, failedAt);
process.exit(failedAt === -1 ? 0 : results[failedAt].exit ?? 1);

function parseProfile(argv) {
  let requested = 'full';
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--profile') {
      requested = argv[++i] || '';
    } else if (arg.startsWith('--profile=')) {
      requested = arg.slice('--profile='.length);
    } else if (arg === '--fast' || arg === '--pr' || arg === '--full') {
      requested = arg.slice(2);
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }
  if (!PROFILES[requested]) {
    console.error(
      `[verify] unknown profile "${requested}". Expected one of: ${Object.keys(PROFILES).join(', ')}`
    );
    printUsage();
    process.exit(1);
  }
  return requested;
}

function printUsage() {
  console.log(`Usage: node scripts/verify.mjs --profile <fast|pr|full>

Profiles:
  fast  ${PROFILES.fast.join(' -> ')}
  pr    ${PROFILES.pr.join(' -> ')}
  full  ${PROFILES.full.join(' -> ')}`);
}

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env },
    });
    child.on('error', reject);
    child.on('close', (code) => resolve(code));
  });
}

function banner(label) {
  const line = '-'.repeat(60);
  console.log(`\n${line}\n[verify] ${label}\n${line}`);
}

function printSummary(results, totalMs, failedAt) {
  console.log('\n' + '-'.repeat(60));
  if (failedAt === -1) {
    console.log('[verify] ALL PASSED\n');
  } else {
    console.log(
      `[verify] FAILED at step ${failedAt + 1}/${results.length}: ${results[failedAt].name}\n`
    );
  }
  const widest = Math.max(...results.map((r) => r.name.length));
  for (const r of results) {
    const sym = r.status === 'passed' ? '+' : r.status === 'failed' ? 'x' : '-';
    const time = r.status === 'skipped' ? 'skipped' : formatMs(r.ms);
    console.log(`  ${sym} ${r.name.padEnd(widest)}   ${time}`);
  }
  console.log(`  ${' '.repeat(widest + 2)}   -----`);
  console.log(`    ${'total'.padEnd(widest)}   ${formatMs(totalMs)}\n`);
}

function formatMs(ms) {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  return `${m}m${rem.toFixed(0).padStart(2, '0')}s`;
}
