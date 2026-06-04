// End-to-end test for create-eikon-react.
//
// What it does (in order):
//   1. Build the CLI (sync template + tsup).
//   2. `npm pack` the CLI to produce the same tarball npm publish would.
//   3. For each scenario:
//        a. Create a fresh temp directory.
//        b. Install the CLI from the tarball into a scratch project so we can
//           invoke its `bin` exactly the way `npx` does after a registry pull.
//        c. Run the CLI non-interactively with the scenario's flags.
//        d. Spot-check generated files (presence/absence) and package.json deps.
//        e. Unless --quick, run pnpm install / typecheck / test / build inside
//           the generated project to prove it actually runs.
//   4. Clean up unless --keep.
//
// Usage:
//   node scripts/e2e.mjs           # full e2e (slow, ~3-5 minutes)
//   node scripts/e2e.mjs --quick   # only verify scaffolding & stripping (~10s)
//   node scripts/e2e.mjs --keep    # do not delete temp directory at the end
//   node scripts/e2e.mjs --only lean   # run only the named scenario(s)

import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Scenario table + per-scenario assertions live in sibling modules to keep
// this file focused on orchestration (build → pack → install → run → verify).
import { SCENARIOS } from './e2e-scenarios.mjs';
import { verifyScenario } from './e2e-verify.mjs';
import {
  PM_INSTALL_ARGS,
  commandExists,
  packCli,
  parseArgs,
  run,
  runWithConcurrency,
  step,
  writeJson,
} from './e2e-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(CLI_DIR, '..', '..');

const args = parseArgs(process.argv.slice(2));

const selected = args.only
  ? SCENARIOS.filter((s) => args.only.includes(s.id))
  : SCENARIOS;

if (selected.length === 0) {
  console.error(
    `[e2e] --only matched nothing. Available scenarios: ${SCENARIOS.map(
      (s) => s.id
    ).join(', ')}`
  );
  process.exit(1);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('[e2e] FAILED:', err);
    process.exit(1);
  });

async function main() {
  // Keep the temp root short on Windows: pnpm's virtual store paths can
  // exceed legacy MAX_PATH limits and break package imports in Vitest 4.
  const tmpBase = await resolveE2eTmpBase();
  const tmp = await mkdtemp(path.join(tmpBase, 'e-'));
  console.log(`[e2e] workspace: ${tmp}`);
  console.log(`[e2e] mode: ${args.quick ? 'quick (no install/build)' : 'full'}`);
  console.log(
    `[e2e] scenarios: ${selected.map((s) => s.id).join(', ')}\n`
  );

  let tarballPath;

  try {
    step('Build CLI bundle + sync template payload');
    await run('pnpm', ['build'], CLI_DIR);

    step('npm pack CLI (simulates publish)');
    tarballPath = await packCli(CLI_DIR, tmp);
    console.log(`        -> ${path.basename(tarballPath)}`);

    step('install tarball into shared sandbox (once)');
    const cliBin = await installSharedSandbox(tmp, tarballPath);
    console.log(`        -> bin: ${path.relative(tmp, cliBin)}`);

    // Audit close-out (accepted-debt A.6): scenarios run with bounded
    // concurrency. Each scenario writes to its own scratch dir under
    // `tmp` and pnpm/npm/bun installs into the scenario's own
    // `node_modules`, so they're independent past the shared sandbox
    // install above. Default concurrency is 1 in CI (deterministic
    // logs, predictable wall-clock under a single-CPU runner) and 3
    // locally (halves full-mode wall time on 4+ core dev boxes
    // without saturating slower laptops). Override with
    // `--concurrency N` either way.
    const isCi = process.env.CI === '1' || process.env.CI === 'true';
    const concurrency = Math.max(
      1,
      args.concurrency ?? (isCi ? 1 : 3)
    );
    if (concurrency === 1) {
      for (const scenario of selected) {
        console.log(
          `\n[e2e] === scenario: ${scenario.id} ` +
            `(flags: ${scenario.flags.join(' ')}) ===`
        );
        await runScenario(scenario, tmp, cliBin);
      }
    } else {
      console.log(
        `\n[e2e] running ${selected.length} scenarios with concurrency=${concurrency}`
      );
      await runWithConcurrency(selected, concurrency, async (scenario) => {
        console.log(
          `\n[e2e] === scenario: ${scenario.id} ` +
            `(flags: ${scenario.flags.join(' ')}) ===`
        );
        await runScenario(scenario, tmp, cliBin);
      });
    }

    console.log(`\n[e2e] ALL PASSED (${selected.length} scenarios)`);
  } finally {
    if (args.keep) {
      console.log(`[e2e] --keep: leaving ${tmp} on disk`);
    } else {
      await rm(tmp, { recursive: true, force: true }).catch(() => {});
    }
  }
}

async function resolveE2eTmpBase() {
  if (process.env.EIKON_E2E_TMPDIR) {
    await mkdir(process.env.EIKON_E2E_TMPDIR, { recursive: true });
    return process.env.EIKON_E2E_TMPDIR;
  }

  if (process.platform === 'win32') {
    const shortTmp = path.join(path.parse(tmpdir()).root, 'ek');
    try {
      await mkdir(shortTmp, { recursive: true });
      return shortTmp;
    } catch {
      // Fall through to the OS temp dir if the drive root is not writable.
    }
  }

  return tmpdir();
}

/**
 * Install the packed CLI tarball into a single shared sandbox once and
 * return the absolute path to its `node_modules/.bin/create-eikon-react`.
 *
 * The earlier shape did this `npm install --no-save tarball` step inside
 * every scenario, which on a 9-scenario run cost ~9× the install
 * overhead even though the tarball is identical across all of them.
 * The shared install drops that to one fixed cost; each scenario only
 * pays for its own scaffold + verify (+ optional pnpm install).
 *
 * The bin file is the same across scenarios — it's a thin shim that
 * resolves the CLI's dist/index.js. Scenarios run in their own scratch
 * dirs and never write into the sandbox, so reuse is safe.
 */
async function installSharedSandbox(tmpRoot, tarballPath) {
  const sandbox = path.join(tmpRoot, 'sandbox');
  await mkdir(sandbox, { recursive: true });
  await writeJson(path.join(sandbox, 'package.json'), {
    name: 'eikon-e2e-sandbox',
    version: '0.0.0',
    private: true,
  });
  await run('npm', ['install', '--no-save', '--silent', tarballPath], sandbox);

  const cliBin = path.join(
    sandbox,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'create-eikon-react.cmd' : 'create-eikon-react'
  );
  if (!existsSync(cliBin)) {
    throw new Error(`expected bin not found: ${cliBin}`);
  }
  return cliBin;
}

async function runScenario(scenario, tmpRoot, cliBin) {
  // Scaffold straight into `tmpRoot` rather than a per-scenario `s-<id>`
  // wrapper: the project name (`eikon-e2e-<id>`) is already unique per
  // scenario, so the wrapper only duplicated the scenario id in the path and
  // cost ~20 chars of Windows MAX_PATH headroom (see PM_INSTALL_ARGS for why
  // every char counts on the animate-ui dependency graph).
  const scratch = tmpRoot;

  step('  invoke CLI');
  // Default to pnpm so the existing scenarios stay green; pm-* scenarios
  // override via `scenario.pm` to exercise the npm / bun rewrite paths.
  const pm = scenario.pm ?? 'pnpm';
  await run(
    cliBin,
    [
      scenario.projectName,
      '--yes',
      ...scenario.flags,
      '--pm',
      pm,
      '--no-install',
      '--no-git',
    ],
    scratch
  );

  const projectDir = path.join(scratch, scenario.projectName);
  if (!existsSync(projectDir)) {
    throw new Error(`CLI did not create ${projectDir}`);
  }

  step('  verify generated tree & deps');
  await verifyScenario(projectDir, scenario.expect);

  if (args.quick) {
    console.log('  (skipping install/test/build because --quick)');
    return;
  }

  if (scenario.scaffoldOnly) {
    // Scenarios marked `scaffoldOnly` produce a tree that isn't
    // installable end-to-end (typically because a downstream
    // dependency — e.g. a populated UI snapshot — isn't available in
    // this checkout). The scaffold + verify step has already run and
    // is the only assertion that's stable here.
    console.log(
      '  (skipping install/test/build because scenario is scaffoldOnly)'
    );
    return;
  }

  // pnpm 9+ refuses to install when `package.json` declares a different
  // `packageManager` field (the `manage-package-manager-versions` rule).
  // Mirror the user's choice end-to-end so the generated project is
  // exercised with its declared pm.
  if (pm !== 'pnpm' && !(await commandExists(pm))) {
    // Locally, missing bun is a soft skip — the scaffold + verify step
    // already validated the rewrite. In CI we MUST fail loud, otherwise
    // a regression in the bun rewrite path would silently land because
    // none of the downstream assertions ran. The `CI=1` env that
    // `run()` injects into child processes is set by GitHub Actions
    // and (locally) by this very script's `run()` helper — so we look
    // at process.env directly here, which carries the user's outer
    // shell value.
    if (process.env.CI === 'true' || process.env.CI === '1') {
      throw new Error(
        `[e2e] scenario "${scenario.id}" requires '${pm}' on PATH but it ` +
          `is not installed. CI must run with all package managers ` +
          `available — install '${pm}' on the runner or remove the scenario.`
      );
    }
    console.log(
      `  (skipping install/build because '${pm}' is not on PATH; ` +
        'scaffold + verify already passed)'
    );
    return;
  }

  step(`  ${pm} install (in generated project)`);
  // Honour the generated project's `pnpm-workspace.yaml` — desktop / mobile
  // scaffolds depend on `apps/*` being recognised as workspace packages so
  // that `tauri:dev` / `cap:sync` resolve via `pnpm --filter "./apps/<x>"`.
  // See `PM_INSTALL_ARGS` for the per-pm flag rationale.
  await run(pm, PM_INSTALL_ARGS[pm], projectDir);

  step(`  ${pm} typecheck`);
  await run(pm, ['run', 'typecheck'], projectDir);

  step(`  ${pm} test`);
  await run(pm, ['run', 'test'], projectDir);

  step(`  ${pm} lint`);
  await run(pm, ['run', 'lint'], projectDir);

  step(`  ${pm} build`);
  await run(pm, ['run', 'build'], projectDir);
}

// Reference REPO_ROOT to keep it available for future test variants that may
// want to install pnpm from the workspace root, etc.
void REPO_ROOT;
