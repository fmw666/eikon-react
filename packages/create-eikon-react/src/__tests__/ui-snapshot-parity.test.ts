/**
 * @file ui-snapshot-parity.test.ts
 * @description The seven UI primitive names live in three places:
 *   1. `REPLACEABLE_UI_FILES` in `apply-ui-snapshot.ts` (canonical basenames
 *      with `.tsx` extension).
 *   2. The `COMPONENTS` list in `scripts/sync-ui-snapshots.mjs` (upstream
 *      slugs the registry CLIs accept).
 *   3. The `ANIMATE_UI_REGISTRY_MAP` keys in the same script (must mention
 *      every slug the registry CLI is going to be asked about).
 *
 * Adding an 8th primitive in any one place silently misses the others. This
 * test reads all three and asserts they describe the same set, modulo the
 * single declared filename rewrite (`sonner` → `toaster.tsx`) which the
 * sync script already documents.
 *
 * Once the parity is established, we also assert each primitive lands as a
 * file under both committed snapshots — `template-snapshots/shadcn/...`
 * and `template-snapshots/animate-ui/...` — when those snapshots are
 * populated. (Empty snapshot dirs are tolerated; the maintainer-only sync
 * script populates them.)
 */

// =================================================================================================
// Imports
// =================================================================================================

import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { REPLACEABLE_UI_FILES } from '../apply-ui-snapshot.js';

// =================================================================================================
// Helpers
// =================================================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const SNAPSHOTS_ROOT = path.join(PACKAGE_ROOT, 'template-snapshots');
const SYNC_SCRIPT = path.join(PACKAGE_ROOT, 'scripts', 'sync-ui-snapshots.mjs');

/**
 * Pull a `const NAME = [ '...', '...', ... ]` array literal out of a .mjs
 * source file. The matched literal must be one entry per line so the regex
 * stays trivial. Returns the unique entries in source order.
 */
function extractArrayConst(source: string, name: string): string[] {
  const start = source.indexOf(`const ${name} = [`);
  if (start === -1) {
    throw new Error(`Could not find "const ${name} = [" in source`);
  }
  const sliceStart = start + `const ${name} = [`.length;
  const end = source.indexOf('];', sliceStart);
  if (end === -1) {
    throw new Error(`Could not find closing "];" after "${name}"`);
  }
  const body = source.slice(sliceStart, end);
  const re = /['"`]([A-Za-z0-9_-]+)['"`]/g;
  const out: string[] = [];
  for (const m of body.matchAll(re)) {
    out.push(m[1]!);
  }
  if (out.length === 0) {
    throw new Error(`No entries extracted from array "${name}"`);
  }
  return out;
}

/**
 * Pull an object's top-level keys out of a `const NAME = { ... }` literal.
 * Keys must appear at column 2 (two-space indent), one per line, optionally
 * quoted. Comments inside the object are tolerated.
 */
function extractObjectKeys(source: string, name: string): string[] {
  const start = source.indexOf(`const ${name} = {`);
  if (start === -1) {
    throw new Error(`Could not find "const ${name} = {" in source`);
  }
  const sliceStart = start + `const ${name} = {`.length;
  // Find the matching closing brace at column 0 (top-level `};`).
  const end = source.indexOf('\n};', sliceStart);
  if (end === -1) {
    throw new Error(`Could not find closing "\\n};" after "${name}"`);
  }
  const body = source.slice(sliceStart, end);
  const out: string[] = [];
  for (const line of body.split('\n')) {
    // Match either bare-word keys or quoted keys at the start of the line.
    const m = /^\s{2}(?:['"]([^'"]+)['"]|([A-Za-z_][A-Za-z0-9_-]*))\s*:/.exec(
      line
    );
    if (m) out.push(m[1] ?? m[2]!);
  }
  if (out.length === 0) {
    throw new Error(`No keys extracted from object "${name}"`);
  }
  return out;
}

/**
 * Apply the same `sonner` → `toaster` rewrite the sync script applies on
 * harvest, returning the canonical basename with `.tsx` extension.
 */
function canonicalFilename(slug: string): string {
  if (slug === 'sonner') return 'toaster.tsx';
  return `${slug}.tsx`;
}

// =================================================================================================
// Tests
// =================================================================================================

describe('UI snapshot parity', () => {
  it('REPLACEABLE_UI_FILES, COMPONENTS, and ANIMATE_UI_REGISTRY_MAP describe the same primitives', async () => {
    const source = await readFile(SYNC_SCRIPT, 'utf8');
    const components = extractArrayConst(source, 'COMPONENTS');
    const registryKeys = extractObjectKeys(source, 'ANIMATE_UI_REGISTRY_MAP');

    expect(new Set(registryKeys)).toEqual(new Set(components));

    const canonical = components.map(canonicalFilename).sort();
    const expected = [...REPLACEABLE_UI_FILES].sort();
    expect(canonical).toEqual(expected);
  });

  it('every primitive lands as a snapshot file (when the snapshot is populated)', async () => {
    for (const ui of ['shadcn', 'animate-ui'] as const) {
      const dir = path.join(SNAPSHOTS_ROOT, ui, 'src', 'shared', 'ui');
      if (!existsSync(dir)) continue; // unpopulated snapshot — tolerated

      const present = new Set(await readdir(dir));
      for (const name of REPLACEABLE_UI_FILES) {
        expect(
          present.has(name),
          `template-snapshots/${ui}/src/shared/ui/${name} missing — ` +
            `re-run \`pnpm sync-ui-snapshots\` or update REPLACEABLE_UI_FILES.`
        ).toBe(true);
      }
    }
  });
});
