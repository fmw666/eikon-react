import { createHash } from 'node:crypto';

/**
 * Full playground parameter snapshot.
 *
 * The preview iframe is built as a max-capability runtime shell, so none
 * of these values affect the built dist hash directly. They still travel
 * through the API because runtime postMessage updates and the file/code
 * simulator share this shape.
 */
export interface BuildInputs {
  platform: string;
  supabase: boolean;
  pm: string;
  design: string;
  layout: string;
  ui: string;
  toastPosition: string;
}

/**
 * Bump whenever the build pipeline's interpretation changes in a way that
 * should invalidate every cache entry on disk.
 *
 * Bumps:
 *   1 - initial cache schema.
 *   2 - platform stripping changed cache shape.
 *   3 - design / ui / layout / toastPosition became runtime-only.
 *   4 - iframe became a max-capability runtime shell; every playground
 *       param is excluded from the build hash and the file/code simulator
 *       is the CLI-output authority.
 *   5 - the `ui` axis is again a scaffold-time switch (Phase J): each
 *       value lays down a different `src/shared/ui/*` snapshot, so the
 *       three values must produce distinct cache entries / built bundles.
 *       The other axes stay runtime-only.
 */
const CACHE_SCHEMA_VERSION = 5;

/**
 * Deterministic short hash of the build-relevant inputs plus a template
 * revision derived from template-react's file contents.
 *
 * The preview bundle is mostly param-agnostic: design / layout /
 * toastPosition / platform / supabase / pm are runtime axes the iframe
 * receives via postMessage. The `ui` axis is the exception — it bakes
 * different component source files into the bundle, so it MUST be part
 * of the hash so each value produces its own cache dir and Vite build.
 */
export function hashBuildInputs(
  inputs: BuildInputs,
  templateRev: string
): string {
  const ordered = {
    cacheSchema: CACHE_SCHEMA_VERSION,
    templateRev,
    ui: inputs.ui,
  };
  return createHash('sha256')
    .update(JSON.stringify(ordered))
    .digest('hex')
    .slice(0, 12);
}
