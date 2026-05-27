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
 */
const CACHE_SCHEMA_VERSION = 4;

/**
 * Deterministic short hash of the build-relevant inputs plus a template
 * revision derived from template-react's file contents.
 *
 * The preview bundle is intentionally param-agnostic: the iframe renders a
 * superset shell and receives every playground selection at runtime. The
 * file/code panel simulator remains responsible for showing the exact CLI
 * scaffold output for those selections. Including params here would only
 * create byte-identical cache entries and reintroduce rebuilds during
 * playground interaction.
 */
export function hashBuildInputs(
  _inputs: BuildInputs,
  templateRev: string
): string {
  const ordered = {
    cacheSchema: CACHE_SCHEMA_VERSION,
    templateRev,
  };
  return createHash('sha256')
    .update(JSON.stringify(ordered))
    .digest('hex')
    .slice(0, 12);
}
