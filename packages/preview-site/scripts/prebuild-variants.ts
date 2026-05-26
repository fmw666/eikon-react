/**
 * @file prebuild-variants.ts
 * @description Docker-build-time pre-baker for the platform×supabase matrix.
 *
 * Without this script, every visitor to a fresh URL on the deployed
 * preview triggers a runtime `viteBuild()` (10–11s cold). That's the
 * dominant source of "open page → wait → still loading" complaints.
 *
 * Phase G collapsed the build matrix from 4032 combos to 6 — the
 * runtime-switchable axes (design / ui / layout / toastPosition) no
 * longer affect the bundle (see `server/hash.ts`), so a single build
 * per `(platform, supabase)` pair covers every variant of the four CSS
 * / Context-driven axes. Pre-baking those 6 in the Docker stage means
 * the first user to land on any URL hits a hot cache — total prebuild
 * cost is ~1 minute and a handful of MB on disk.
 *
 * Wiring:
 *   - This script is bundled by `tsup.config.ts` alongside `prod.ts` to
 *     `dist-server/prebuild-variants.js`. Run from the Dockerfile's
 *     `builder` stage with `node dist-server/prebuild-variants.js`.
 *   - Output dirs land in `packages/template-react/.preview-cache/`,
 *     which is inside the workspace and gets carried through by
 *     `COPY --from=builder /app /app` in the runner stage.
 *
 * Sequential, not parallel: the Docker `builder` stage typically has
 * 1–2 cores; parallel `viteBuild()` calls thrash and end up slower.
 */

import {
  ensureBuild,
  isReady,
  getError,
  TEMPLATE_REACT_DIR,
} from '../server/builder';
import { type BuildInputs } from '../server/hash';

// Mirrors `DEFAULT_INPUTS` in builder.ts and the schema in
// `src/lib/params-schema.ts`. Kept hand-written here so this script has
// no dependency on the React-side schema module (which pulls in browser
// globals via its consumers and would bloat the bundle).
const DEFAULT: BuildInputs = {
  platform: 'web',
  supabase: false,
  design: 'default',
  layout: 'stacked',
  ui: 'animate-ui',
  toastPosition: 'top-right',
};

// Phase G: the build matrix is now exactly `platform × supabase` — the
// other four axes are runtime-switchable (CSS class on `<html>` for
// design/ui, React Context for layout, component state for
// toastPosition) and do not influence the bundle. We pre-bake all 6
// combinations: 1 default + 5 non-default permutations below.
//
// Note: although `layout` is a runtime axis now, the playground UI
// still snaps it on platform change (web→stacked, desktop→sidebar,
// mobile→mobile-drawer) for ergonomics. Since layout is no longer in
// the build hash, we don't bother flipping it here — the prebuilt
// bundle for `(desktop, false)` is the same dist whether layout is
// `sidebar` or `stacked`.
const VARIATIONS: ReadonlyArray<Partial<BuildInputs>> = [
  // platform axis × supabase=false
  { platform: 'desktop' },
  { platform: 'mobile' },
  // supabase=true × all 3 platforms
  { supabase: true },
  { platform: 'desktop', supabase: true },
  { platform: 'mobile', supabase: true },
];

function describe(inputs: BuildInputs): string {
  const out: string[] = [];
  for (const k of Object.keys(inputs) as Array<keyof BuildInputs>) {
    if (inputs[k] !== DEFAULT[k]) out.push(`${k}=${String(inputs[k])}`);
  }
  return out.length === 0 ? 'default' : out.join(' ');
}

async function buildOne(inputs: BuildInputs): Promise<void> {
  const label = describe(inputs);
  const t0 = Date.now();
  const initial = await ensureBuild(inputs);
  if (initial.status === 'error') {
    throw new Error(`build error for ${label}: ${initial.error ?? '<no message>'}`);
  }
  // ensureBuild returns immediately; the actual viteBuild runs in the
  // background. Poll isReady until the dist exists or we hit an error.
  // No timeout here — a hung build during the Docker stage should fail
  // the whole image (Fly's build budget will time out the container).
  for (;;) {
    if (isReady(initial.hash)) break;
    const err = getError(initial.hash);
    if (err) {
      throw new Error(`build error for ${label}: ${err}`);
    }
    await new Promise<void>((r) => setTimeout(r, 250));
  }
  const dt = Date.now() - t0;
  console.log(`  [${initial.hash}] ${label}  (${(dt / 1000).toFixed(1)}s)`);
}

async function main(): Promise<void> {
  // Force NODE_ENV='development' the same way `server/builder.ts` does
  // at module load. The bundled builder already sets it, but we set it
  // here too for the case someone runs the unbundled script via tsx
  // (e.g. local debugging) — Vite's `mode === 'development'` flag alone
  // is not enough when NODE_ENV='production' is in the environment.
  process.env.NODE_ENV = 'development';

  console.log(`[prebuild] template root: ${TEMPLATE_REACT_DIR}`);
  console.log(`[prebuild] base + ${VARIATIONS.length} variations`);

  const all: BuildInputs[] = [DEFAULT];
  for (const v of VARIATIONS) {
    all.push({ ...DEFAULT, ...v });
  }

  const t0 = Date.now();
  for (const inputs of all) {
    await buildOne(inputs);
  }
  const dt = Date.now() - t0;
  console.log(`[prebuild] done — ${all.length} variants in ${(dt / 1000).toFixed(1)}s`);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? (err.stack ?? err.message) : String(err);
  console.error(`[prebuild] FAILED:\n${msg}`);
  process.exit(1);
});
