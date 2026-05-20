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
   * RootLayout variant is wired in and — at scaffold time — whether the
   * `apps/desktop` (Tauri) or `apps/mobile` (Capacitor) shell directory
   * survives the strip. The preview always builds the web bundle (no
   * Tauri/Capacitor compile in the playground), but the chosen platform
   * still narrows layout values via params-schema's `valuesWhen`, so the
   * iframe reflects the target's typical shell.
   */
  platform: string;
  supabase: boolean;
  design: string;
  layout: string;
  ui: string;
  toast: string;
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
    platform: String(inputs.platform),
    supabase: !!inputs.supabase,
    design: String(inputs.design),
    layout: String(inputs.layout),
    ui: String(inputs.ui),
    toast: String(inputs.toast),
  };
  return createHash('sha256')
    .update(JSON.stringify(ordered))
    .digest('hex')
    .slice(0, 12);
}
