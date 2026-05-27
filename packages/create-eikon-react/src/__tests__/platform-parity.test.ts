/**
 * @file platform-parity.test.ts
 * @description Adding a new platform axis means three independent edits:
 *   1. `VARIANT_CHOICES.platform` in `index.ts` (the canonical list).
 *   2. `PLATFORM_OVERRIDES` in `index.ts` (per-axis platform-keyed overrides).
 *   3. `PLATFORM_SCRIPTS` in `strip-features.ts` (per-platform script tags).
 *
 * Only CLI ↔ schema is fenced today (via `cli-schema-parity.test.ts`).
 * This test pins the three intra-CLI lists against each other so a future
 * platform addition can't ship half-wired:
 *
 *   - `PLATFORM_SCRIPTS` keys === `VARIANT_CHOICES.platform` (every platform
 *     must declare its `package.json` script tags, even if the array is `[]`).
 *   - Every inner key of every `PLATFORM_OVERRIDES.<axis>` block must be a
 *     member of `VARIANT_CHOICES.platform` (you can't override for an unknown
 *     platform).
 */

// =================================================================================================
// Imports
// =================================================================================================

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { PLATFORM_SCRIPT_TAGS } from '../strip-features.js';

// =================================================================================================
// Helpers
// =================================================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_ROOT = path.resolve(__dirname, '..');

/**
 * Pull `VARIANT_CHOICES.platform` (a `[ ... ] as const` literal) out of
 * `index.ts`. The file owns the canonical platform list — extracting via
 * regex avoids an import cycle and matches how `cli-schema-parity.test.ts`
 * reads other axes from the same file.
 */
function extractPlatformValues(source: string): string[] {
  const start = source.indexOf('VARIANT_CHOICES = {');
  if (start === -1) throw new Error('VARIANT_CHOICES not found in index.ts');
  const platformIdx = source.indexOf('platform:', start);
  if (platformIdx === -1) throw new Error('platform key not found');
  const arrStart = source.indexOf('[', platformIdx);
  const arrEnd = source.indexOf(']', arrStart);
  if (arrStart === -1 || arrEnd === -1) {
    throw new Error('platform array not parseable');
  }
  const body = source.slice(arrStart + 1, arrEnd);
  const out: string[] = [];
  for (const m of body.matchAll(/['"]([A-Za-z0-9_-]+)['"]/g)) {
    out.push(m[1]!);
  }
  if (out.length === 0) throw new Error('no platform values extracted');
  return out;
}

/**
 * Walk PLATFORM_OVERRIDES and return every (axis, platform) pair that
 * appears as an inner key. We don't need the override values — we just
 * need to assert each inner platform key is a member of the canonical
 * platform list.
 */
function extractOverridePlatforms(source: string): Array<{
  axis: string;
  platform: string;
}> {
  const start = source.indexOf('PLATFORM_OVERRIDES');
  if (start === -1) throw new Error('PLATFORM_OVERRIDES not found');
  const open = source.indexOf('{', start);
  if (open === -1) throw new Error('PLATFORM_OVERRIDES { not found');

  const body = readBraced(source, open);
  const out: Array<{ axis: string; platform: string }> = [];

  let i = 0;
  while (i < body.length) {
    const colon = body.indexOf(':', i);
    if (colon === -1) break;
    const axisName = body.slice(i, colon).match(/([A-Za-z_][\w]*)\s*$/)?.[1];
    if (!axisName) break;
    const axisOpen = body.indexOf('{', colon);
    if (axisOpen === -1) break;
    const axisBody = readBraced(body, axisOpen);
    i = axisOpen + axisBody.length + 2;

    let j = 0;
    while (j < axisBody.length) {
      const pcolon = axisBody.indexOf(':', j);
      if (pcolon === -1) break;
      const platName = axisBody
        .slice(j, pcolon)
        .match(/([A-Za-z_][\w-]*)\s*$/)?.[1];
      if (!platName) break;
      const pOpen = axisBody.indexOf('{', pcolon);
      if (pOpen === -1) break;
      const pBody = readBraced(axisBody, pOpen);
      out.push({ axis: axisName, platform: platName });
      j = pOpen + pBody.length + 2;
    }
  }
  return out;
}

/** Read a `{ ... }` body with balanced braces, starting at the index of the opening brace. */
function readBraced(source: string, openIdx: number): string {
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    const c = source[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return source.slice(openIdx + 1, i);
    }
  }
  throw new Error('unbalanced braces');
}

// =================================================================================================
// Tests
// =================================================================================================

describe('platform parity', () => {
  it('PLATFORM_SCRIPT_TAGS keys equal VARIANT_CHOICES.platform', async () => {
    const indexSrc = await readFile(path.join(SRC_ROOT, 'index.ts'), 'utf8');
    const platforms = extractPlatformValues(indexSrc);
    const scriptKeys = Object.keys(PLATFORM_SCRIPT_TAGS).sort();
    expect(scriptKeys).toEqual([...platforms].sort());
  });

  it('every PLATFORM_OVERRIDES inner key is a known platform', async () => {
    const indexSrc = await readFile(path.join(SRC_ROOT, 'index.ts'), 'utf8');
    const platforms = new Set(extractPlatformValues(indexSrc));
    const overrides = extractOverridePlatforms(indexSrc);
    for (const { axis, platform } of overrides) {
      expect(
        platforms.has(platform),
        `PLATFORM_OVERRIDES.${axis}.${platform} references an unknown platform — ` +
          `add it to VARIANT_CHOICES.platform or remove the override`
      ).toBe(true);
    }
  });

  it('every web-eligible platform appears in PLATFORM_SCRIPT_TAGS even if its script list is empty', async () => {
    // Encodes the contract: a platform without scripts must still be
    // listed (as `[]`), so `prunePackageScripts` can iterate every
    // declared tag rather than silently treating "no entry" as
    // "platform doesn't exist".
    const indexSrc = await readFile(path.join(SRC_ROOT, 'index.ts'), 'utf8');
    const platforms = extractPlatformValues(indexSrc);
    for (const p of platforms) {
      expect(
        Object.prototype.hasOwnProperty.call(PLATFORM_SCRIPT_TAGS, p),
        `PLATFORM_SCRIPT_TAGS.${p} missing — declare it as [] if the platform owns no scripts`
      ).toBe(true);
    }
  });
});
