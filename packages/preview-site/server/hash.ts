import { createHash } from 'node:crypto';

/**
 * Inputs that actually affect the built preview bundle. We deliberately
 * exclude tooling-only flags (e.g. `pm`) because they have no effect on the
 * generated dist/, so two configs that differ only on those flags should
 * share a cache entry.
 */
export interface BuildInputs {
  /**
   * Top-level "intent" axis (web / desktop / mobile). Affects which
   * RootLayout variant is wired in AND — both at scaffold time AND in
   * the preview playground — whether the `apps/desktop` (Tauri) or
   * `apps/mobile` (Capacitor) shell directory survives the strip,
   * whether `tauri:*` / `cap:*` scripts stay in `package.json`, and
   * whether `pnpm-workspace.yaml` is kept. The preview always builds
   * the web bundle (no Tauri/Capacitor compile in the playground), but
   * the chosen platform narrows layout values via params-schema's
   * `valuesWhen` AND drives directory-level stripping so the iframe
   * AND the rendered file tree both reflect the scaffolded target 1:1.
   */
  platform: string;
  supabase: boolean;
  design: string;
  layout: string;
  ui: string;
  toastPosition: string;
}

/**
 * Bump whenever the build pipeline's *interpretation* of the inputs
 * changes in a way that should invalidate every cache entry on disk —
 * e.g. when we toggle a `stripFeatures` option that alters the produced
 * tree. The point is to avoid stale `.preview-cache/<hash>/` directories
 * that were built under the old semantics getting re-served with the
 * same hash key after a code update.
 *
 * Bumps:
 *   1 — initial cache schema.
 *   2 — playground stops setting `keepShells: true`; per-platform trees
 *       now strip `apps/<other-shell>/`, prune `tauri:*` / `cap:*`
 *       scripts, and drop `pnpm-workspace.yaml` on web. Old cache
 *       entries built with the keepShells opt-out must not be reused.
 *   3 — Phase G: design / ui / layout / toastPosition no longer affect
 *       the built bundle (they're runtime-switched via CSS class /
 *       Context / state). The hash now only mixes platform + supabase,
 *       so the build matrix collapses from 4032 to 6. Old cache
 *       entries keyed on the wider 6-tuple must not be reused.
 */
const CACHE_SCHEMA_VERSION = 3;

/**
 * Deterministic short hash of the build-relevant inputs + a "template
 * revision" derived from template-react's file contents (see
 * `server/fingerprint.ts`). Two equivalent inputs always map to the same
 * hash; touching any watched template source produces a fresh hash, which
 * naturally invalidates the cache. `CACHE_SCHEMA_VERSION` provides a
 * second invalidation lever for changes that don't show up in the
 * template tree (e.g. server-side strip-option flips).
 *
 * Phase G intentionally drops `design / ui / layout / toastPosition`
 * from the mix even though they live on the BuildInputs type — they're
 * runtime-only now (see comments on the omitted fields in the
 * call-site), and including them here would needlessly multiply cache
 * entries that are byte-identical on disk.
 */
export function hashBuildInputs(
  inputs: BuildInputs,
  templateRev: string
): string {
  const ordered = {
    cacheSchema: CACHE_SCHEMA_VERSION,
    templateRev,
    platform: String(inputs.platform),
    supabase: !!inputs.supabase,
  };
  return createHash('sha256')
    .update(JSON.stringify(ordered))
    .digest('hex')
    .slice(0, 12);
}
