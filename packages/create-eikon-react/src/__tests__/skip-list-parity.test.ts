/**
 * @file skip-list-parity.test.ts
 * @description Safety net for the "single source of truth" comment at the
 *  top of `skip-list.ts`. Of the five template-skip touchpoints, four import
 *  `TEMPLATE_COPY_SKIP` directly and are kept honest by the TS compiler; the
 *  fifth — `scripts/sync-template.mjs` — runs from raw Node before tsup, so
 *  it duplicates the literal. This test reads that script's source and
 *  asserts the duplicate matches, failing CI before the drift can ship.
 */

// =================================================================================================
// Imports
// =================================================================================================

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { TEMPLATE_COPY_SKIP } from '../skip-list.js';

// =================================================================================================
// Helpers
// =================================================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_PACKAGES = path.resolve(__dirname, '..', '..', '..');

/**
 * Parse the basenames out of a `new Set([...])` literal in a source file.
 * We do this with a regex because the consumer files we need to read are
 * either .mjs (cannot import TS) or live in another tsconfig project; a
 * regex is cheaper than wiring up cross-package imports just for one test.
 *
 * Matches: `'foo'`, `"foo"`, `\`foo\``, optionally with leading dot for
 * dotfiles. Whitespace and trailing commas are tolerated.
 */
function extractSetEntries(source: string, varName: string): Set<string> {
  const setStart = source.indexOf(`${varName} = new Set([`);
  if (setStart === -1) {
    throw new Error(`Could not find "${varName} = new Set([" in source`);
  }
  const sliceStart = setStart + `${varName} = new Set([`.length;
  const sliceEnd = source.indexOf(']);', sliceStart);
  if (sliceEnd === -1) {
    throw new Error(`Could not find closing "]);" after "${varName}"`);
  }
  const body = source.slice(sliceStart, sliceEnd);
  const out = new Set<string>();
  // Match string literals; tolerate single quotes, double quotes, backticks.
  // Comments between entries are fine — they don't contain quoted strings
  // that look like skip names.
  const re = /['"`]([.A-Za-z0-9_-]+)['"`]/g;
  for (const m of body.matchAll(re)) {
    out.add(m[1]!);
  }
  if (out.size === 0) {
    throw new Error(`No entries extracted from "${varName}"`);
  }
  return out;
}

async function readSkipNamesFrom(
  relPath: string,
  varName: string
): Promise<Set<string>> {
  const abs = path.resolve(REPO_PACKAGES, relPath);
  const source = await readFile(abs, 'utf8');
  return extractSetEntries(source, varName);
}

// =================================================================================================
// Tests
// =================================================================================================

describe('skip-list parity', () => {
  it('sync-template.mjs EXCLUDE equals TEMPLATE_COPY_SKIP', async () => {
    const fromScript = await readSkipNamesFrom(
      'create-eikon-react/scripts/sync-template.mjs',
      'EXCLUDE'
    );
    expect([...fromScript].sort()).toEqual([...TEMPLATE_COPY_SKIP].sort());
  });

  it('TEMPLATE_COPY_SKIP itself round-trips through the regex extractor', async () => {
    // Sanity: if the regex breaks, every other assertion in this file
    // could silently pass with an empty set. Read the canonical file
    // through the same extractor and assert it matches the in-memory set.
    const fromSource = await readSkipNamesFrom(
      'create-eikon-react/src/skip-list.ts',
      'TEMPLATE_COPY_SKIP: ReadonlySet<string>'
    );
    expect([...fromSource].sort()).toEqual([...TEMPLATE_COPY_SKIP].sort());
  });

  it('every entry is a basename (no slashes, no globs)', () => {
    for (const name of TEMPLATE_COPY_SKIP) {
      expect(name).not.toMatch(/[/\\*?]/);
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it('contains the load-bearing entries the README/docs promise', () => {
    // Pin the contract so doc updates and code stay aligned. Adding an entry
    // here when you add one to skip-list.ts is the cheapest way to surface
    // the change in code review.
    const expected = [
      'node_modules',
      'dist',
      'coverage',
      '.vite',
      '.turbo',
      '.tsbuildinfo',
      '.preview-cache',
      '.git',
    ];
    for (const name of expected) {
      expect(TEMPLATE_COPY_SKIP.has(name)).toBe(true);
    }
  });
});
