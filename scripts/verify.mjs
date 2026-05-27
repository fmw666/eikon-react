// Full-chain verification for the eikon-react monorepo.
//
// Runs the same gauntlet a release candidate has to pass, in this order:
//
//   1. typecheck   — three packages, parallel via pnpm -r
//   2. test        — three packages, includes strip-drift parity (6 combos)
//   3. lint        — three packages
//   4. build       — three packages
//   5. e2e         — build CLI → npm pack → 7 scenarios, each: scaffold +
//                    install + typecheck + test + lint + build inside the
//                    generated project. Slowest step (~3-5 min).
//
// Behaviour:
//   - Fail-fast: the first non-zero step stops the chain. typecheck failing
//     means test results would be misleading, so there's no point running on.
//   - Each step prints a banner, pnpm output streams through, then a per-step
//     elapsed time. On success the script ends with a green summary table; on
//     failure the failing step's exit code propagates.
//
// Usage:
//   pnpm verify        # full chain (~5-7 min)
//   node scripts/verify.mjs

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

const STEPS = [
  { name: 'typecheck', cmd: 'pnpm', args: ['typecheck'] },
  { name: 'test',      cmd: 'pnpm', args: ['test'] },
  { name: 'lint',      cmd: 'pnpm', args: ['lint'] },
  { name: 'build',     cmd: 'pnpm', args: ['build'] },
  { name: 'e2e',       cmd: 'pnpm', args: ['e2e'] },
];

const results = STEPS.map((s) => ({ name: s.name, status: 'skipped', ms: 0 }));
const totalStart = Date.now();
let failedAt = -1;

for (let i = 0; i < STEPS.length; i++) {
  const step = STEPS[i];
  banner(`step ${i + 1}/${STEPS.length}: ${step.name}`);
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
    console.log(`[verify] step ${i + 1}/${STEPS.length}: ${step.name} — PASSED in ${formatMs(ms)}\n`);
  } else {
    results[i].status = 'failed';
    results[i].exit = code;
    failedAt = i;
    console.error(`[verify] step ${i + 1}/${STEPS.length}: ${step.name} — FAILED (exit ${code}) after ${formatMs(ms)}\n`);
    break;
  }
}

const totalMs = Date.now() - totalStart;
printSummary(results, totalMs, failedAt);
process.exit(failedAt === -1 ? 0 : results[failedAt].exit ?? 1);

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, CI: '1' },
    });
    child.on('error', reject);
    child.on('close', (code) => resolve(code));
  });
}

function banner(label) {
  const line = '─'.repeat(60);
  console.log(`\n${line}\n[verify] ${label}\n${line}`);
}

function printSummary(results, totalMs, failedAt) {
  console.log('\n' + '─'.repeat(60));
  if (failedAt === -1) {
    console.log('[verify] ALL PASSED\n');
  } else {
    console.log(`[verify] FAILED at step ${failedAt + 1}/${results.length}: ${results[failedAt].name}\n`);
  }
  const widest = Math.max(...results.map((r) => r.name.length));
  for (const r of results) {
    const sym = r.status === 'passed' ? '✓' : r.status === 'failed' ? '✗' : '-';
    const time = r.status === 'skipped' ? 'skipped' : formatMs(r.ms);
    console.log(`  ${sym} ${r.name.padEnd(widest)}   ${time}`);
  }
  console.log(`  ${' '.repeat(widest + 2)}   ─────`);
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
