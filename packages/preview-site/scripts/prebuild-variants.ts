/**
 * @file prebuild-variants.ts
 * @description Docker-build-time pre-baker for the preview shells.
 *
 * The deployed playground uses ONE max-capability iframe bundle per
 * (template-rev, `ui`) pair. Every other playground parameter is
 * pushed into the iframe at runtime, but `ui` is a scaffold-time file
 * swap (Phase J) so each `--ui` value produces its own build hash. We
 * prebake all three so a cold visitor selecting any `ui` value gets a
 * cache hit instead of paying 5–15s of Vite cold-start on the 1GB
 * Fly machine.
 */

import {
  ensureBuild,
  isReady,
  getError,
  TEMPLATE_REACT_DIR,
} from '../server/builder';
import { type BuildInputs } from '../server/hash';

const UI_VALUES: ReadonlyArray<BuildInputs['ui']> = [
  'custom',
  'shadcn',
  'animate-ui',
];

const BASE: Omit<BuildInputs, 'ui'> = {
  platform: 'web',
  supabase: false,
  pm: 'pnpm',
  design: 'default',
  layout: 'stacked',
  toastPosition: 'top-right',
};

async function main(): Promise<void> {
  process.env.NODE_ENV = 'development';

  console.log(`[prebuild] template root: ${TEMPLATE_REACT_DIR}`);
  console.log(
    `[prebuild] pre-warming ${UI_VALUES.length} ui shell(s): ${UI_VALUES.join(', ')}`
  );

  const t0 = Date.now();
  // Sequential, not parallel: viteBuild is ~600 MB peak per build and
  // the runtime is a 1 GB Fly machine. Two parallel builds would OOM
  // boot. Three sequential builds at ~10s each ≈ 30s total — well
  // inside the Fly grace_period after P4.24's bump.
  //
  // Audit close-out: per-shell budget guards against a wedged build
  // hanging the Docker layer forever. ensureBuild has its own
  // BUILD_TIMEOUT_MS (60s) for the underlying viteBuild; this poll
  // ceiling protects the surrounding loop in case a build's status
  // somehow stays in `building` past the runBuild timeout (e.g. an
  // orphaned in-process build in dev). 3 minutes per shell × 3
  // shells = 9 min worst-case, still inside any reasonable Docker
  // build timeout.
  const PER_SHELL_BUDGET_MS = 180_000;
  for (const ui of UI_VALUES) {
    const inputs: BuildInputs = { ...BASE, ui };
    const tShell = Date.now();
    const initial = await ensureBuild(inputs);
    if (initial.status === 'error') {
      throw new Error(`[${ui}] ${initial.error ?? '<no message>'}`);
    }
    const deadline = tShell + PER_SHELL_BUDGET_MS;
    for (;;) {
      if (isReady(initial.hash)) break;
      const err = getError(initial.hash);
      if (err) throw new Error(`[${ui}] ${err}`);
      if (Date.now() > deadline) {
        throw new Error(
          `[${ui}] prebuild stuck in 'building' state for ` +
            `${(PER_SHELL_BUDGET_MS / 1000).toFixed(0)}s (hash=${initial.hash}). ` +
            `Aborting to fail the Docker layer fast.`
        );
      }
      await new Promise<void>((r) => setTimeout(r, 250));
    }
    const dt = Date.now() - tShell;
    console.log(
      `  [${initial.hash}] ui=${ui}  (${(dt / 1000).toFixed(1)}s)`
    );
  }
  const total = Date.now() - t0;
  console.log(`[prebuild] done in ${(total / 1000).toFixed(1)}s`);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? (err.stack ?? err.message) : String(err);
  console.error(`[prebuild] FAILED:\n${msg}`);
  process.exit(1);
});
