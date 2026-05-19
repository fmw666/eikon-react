import { createHash } from 'node:crypto';

/**
 * Inputs that actually affect the built preview bundle. We deliberately
 * exclude tooling-only flags (e.g. `pm`) because they have no effect on the
 * generated dist/, so two configs that differ only on those flags should
 * share a cache entry.
 */
export interface BuildInputs {
  supabase: boolean;
  query: boolean;
  design: string;
  layout: string;
  ui: string;
}

/**
 * Deterministic short hash of the build-relevant inputs + a "template
 * revision" derived from template-react's file contents (see
 * `server/fingerprint.ts`). Two equivalent inputs always map to the same
 * hash; touching any watched template source produces a fresh hash, which
 * naturally invalidates the cache.
 */
export function hashBuildInputs(
  inputs: BuildInputs,
  templateRev: string
): string {
  const ordered = {
    templateRev,
    supabase: !!inputs.supabase,
    query: !!inputs.query,
    design: String(inputs.design),
    layout: String(inputs.layout),
    ui: String(inputs.ui),
  };
  return createHash('sha256')
    .update(JSON.stringify(ordered))
    .digest('hex')
    .slice(0, 12);
}
