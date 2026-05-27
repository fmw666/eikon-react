/**
 * @file prebuild-variants.ts
 * @description Docker-build-time pre-baker for the single preview shell.
 *
 * The deployed playground uses one max-capability iframe bundle per
 * template revision. Every visible playground parameter is pushed into
 * that iframe at runtime, while the file/code panels use simulate-strip
 * to show the exact CLI scaffold output. That means Docker only needs to
 * prebuild one cache entry.
 */

import {
  ensureBuild,
  isReady,
  getError,
  TEMPLATE_REACT_DIR,
} from '../server/builder';
import { type BuildInputs } from '../server/hash';

const DEFAULT: BuildInputs = {
  platform: 'web',
  supabase: false,
  pm: 'pnpm',
  design: 'default',
  layout: 'stacked',
  ui: 'animate-ui',
  toastPosition: 'top-right',
};

async function main(): Promise<void> {
  process.env.NODE_ENV = 'development';

  console.log(`[prebuild] template root: ${TEMPLATE_REACT_DIR}`);
  console.log('[prebuild] single max-capability preview shell');

  const t0 = Date.now();
  const initial = await ensureBuild(DEFAULT);
  if (initial.status === 'error') {
    throw new Error(initial.error ?? '<no message>');
  }
  for (;;) {
    if (isReady(initial.hash)) break;
    const err = getError(initial.hash);
    if (err) throw new Error(err);
    await new Promise<void>((r) => setTimeout(r, 250));
  }
  const dt = Date.now() - t0;
  console.log(`  [${initial.hash}] preview-shell  (${(dt / 1000).toFixed(1)}s)`);
  console.log(`[prebuild] done in ${(dt / 1000).toFixed(1)}s`);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? (err.stack ?? err.message) : String(err);
  console.error(`[prebuild] FAILED:\n${msg}`);
  process.exit(1);
});
