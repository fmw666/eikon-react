/**
 * @file prebuild-variants.ts
 * @description Docker-build-time pre-baker for the single-axis variant subset.
 *
 * Without this script, every visitor to a fresh URL on the deployed
 * preview triggers a runtime `viteBuild()` (10–11s cold). That's the
 * dominant source of "open page → wait → still loading" complaints.
 *
 * Pre-generating the full 4032-combo space is infeasible (75 min – 10 h
 * Docker build + ~20 GB image). Pre-generating just `default + each
 * non-default value on each axis` (~25 combos) covers exactly the case
 * "user changed ONE param from the defaults" — which is what the vast
 * majority of first-time visitors do. Roughly 4 minutes of build time,
 * ~75 MB on disk inside the image.
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

// Single-axis variations. Each entry overrides exactly one field on the
// default and produces one cache entry. For `platform`, we also flip the
// dependent `layout` to its per-platform default — otherwise the chosen
// pair `(platform=mobile, layout=stacked)` is invalid under the schema's
// `valuesWhen`. The build will still run (the strip is unaware of cross-
// axis rules), but the rendered iframe would mount no layout — not what
// a real first visit looks like.
const VARIATIONS: ReadonlyArray<Partial<BuildInputs>> = [
  // platform axis (with layout follow-through to the platform's default)
  { platform: 'desktop', layout: 'sidebar' },
  { platform: 'mobile', layout: 'mobile-drawer' },
  // supabase axis (single non-default value)
  { supabase: true },
  // design axis (13 non-default values)
  { design: 'apple' },
  { design: 'linear' },
  { design: 'anthropic' },
  { design: 'vercel' },
  { design: 'notion' },
  { design: 'flat' },
  { design: 'material' },
  { design: 'skeuomorphism' },
  { design: 'neumorphism' },
  { design: 'liquid-glass' },
  { design: 'claymorphism' },
  { design: 'aurora' },
  { design: 'neo-brutalism' },
  // layout axis (3 non-default values for the default platform 'web')
  { layout: 'sidebar' },
  { layout: 'topbar-sidebar' },
  { layout: 'centered' },
  // ui axis (2 non-default values)
  { ui: 'radix' },
  { ui: 'shadcn-style' },
  // toastPosition axis (3 non-default values)
  { toastPosition: 'top-center' },
  { toastPosition: 'bottom-center' },
  { toastPosition: 'bottom-right' },
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
