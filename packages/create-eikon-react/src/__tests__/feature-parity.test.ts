/**
 * @file feature-parity.test.ts
 * @description Drift fences around the `FeatureFlags` interface — three
 * places must stay in lock-step:
 *
 *   1. The interface itself in `strip-features.ts` (single source of truth
 *      for which features the scaffolder knows about).
 *   2. `PACKAGE_DEPS_BY_FEATURE` in `strip-features.ts` (npm deps removed
 *      when each feature is disabled).
 *   3. `resolveFeatures` in `index.ts` (reads each field from `argv` and
 *      writes into the returned `flags` object).
 *
 * Adding a feature to (1) without updating (2) and (3) silently leaks
 * deps and produces a feature flag that's always `false`. This file
 * catches both drifts statically — no scaffold required.
 *
 * Pattern follows `platform-parity.test.ts`: read source files via `fs`,
 * regex-extract the relevant literals / function bodies, assert in
 * vitest. Same idiom keeps the test free of cross-package TS imports
 * and free of runtime dependency on either file's compiled exports.
 */

// =================================================================================================
// Imports
// =================================================================================================

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { FEATURE_DEPS } from '../strip-features.js';

// =================================================================================================
// Helpers
// =================================================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_ROOT = path.resolve(__dirname, '..');

/** Strip block + line comments so they don't trip the literal scans below. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** Read a `{ ... }` body with balanced braces, starting at the opening brace. */
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

/**
 * Parse `interface FeatureFlags { … }` and return the field names. Only
 * top-level keys are extracted; nested object types are not expected here
 * (FeatureFlags is intentionally flat boolean flags).
 */
function extractFeatureFlagFields(source: string): string[] {
  const stripped = stripComments(source);
  const start = stripped.indexOf('interface FeatureFlags');
  if (start === -1) throw new Error('FeatureFlags interface not found');
  const open = stripped.indexOf('{', start);
  if (open === -1) throw new Error('FeatureFlags { not found');
  const body = readBraced(stripped, open);
  const out: string[] = [];
  // Each member: `<name>: <type>;` or `<name>?: <type>;`
  for (const m of body.matchAll(/(\w+)\s*\??\s*:/g)) {
    out.push(m[1]!);
  }
  if (out.length === 0) throw new Error('no FeatureFlags fields extracted');
  return out;
}

/**
 * Parse the body of `async function resolveFeatures(...) { … }` and
 * return the set of FeatureFlags fields the function assigns to
 * (i.e. occurrences of `flags.<name> =`). A field that the interface
 * declares but the function never assigns is a drift case — the field
 * stays at its initial value forever, defeating the flag.
 */
function extractResolvedFields(source: string): Set<string> {
  const stripped = stripComments(source);
  const start = stripped.indexOf('function resolveFeatures');
  if (start === -1) throw new Error('resolveFeatures fn not found');
  const open = stripped.indexOf('{', start);
  if (open === -1) throw new Error('resolveFeatures { not found');
  const body = readBraced(stripped, open);
  const out = new Set<string>();
  // We accept any assignment that names a flags field on the LHS:
  //   `flags.foo = …`
  //   `flags['foo'] = …`
  //   `flags.foo ??= …`
  // The initial-state `const flags: FeatureFlags = { foo: false }` literal
  // also counts — a field that's only there satisfies the contract that
  // its default exists.
  for (const m of body.matchAll(/flags\.(\w+)\s*[?!]?\??=/g)) {
    out.add(m[1]!);
  }
  for (const m of body.matchAll(/flags\[\s*['"`](\w+)['"`]\s*\]\s*[?!]?\??=/g)) {
    out.add(m[1]!);
  }
  // Also extract the initial-state object literal:
  //   `const flags: FeatureFlags = { foo: false, bar: true }`
  const initRe = /const\s+flags\s*:\s*FeatureFlags\s*=\s*\{/;
  const initMatch = body.match(initRe);
  if (initMatch) {
    const initOpen = body.indexOf('{', initMatch.index!);
    const initBody = readBraced(body, initOpen);
    for (const m of initBody.matchAll(/(\w+)\s*:/g)) {
      out.add(m[1]!);
    }
  }
  return out;
}

// =================================================================================================
// Tests
// =================================================================================================

describe('FeatureFlags parity', () => {
  it('PACKAGE_DEPS_BY_FEATURE keys are a subset of FeatureFlags fields', async () => {
    // Subset, not equality: a feature that exists in `FeatureFlags` but
    // strips no extra deps (e.g. a pure UI flag) legitimately has no
    // entry in `PACKAGE_DEPS_BY_FEATURE`. The other direction is a bug:
    // an entry referencing a non-existent feature would never fire.
    const stripSrc = await readFile(
      path.join(SRC_ROOT, 'strip-features.ts'),
      'utf8'
    );
    const fields = new Set(extractFeatureFlagFields(stripSrc));
    const offenders: string[] = [];
    for (const key of Object.keys(FEATURE_DEPS)) {
      if (!fields.has(key)) offenders.push(key);
    }
    expect(
      offenders,
      `PACKAGE_DEPS_BY_FEATURE has keys that aren't FeatureFlags fields: ` +
        offenders.join(', ')
    ).toEqual([]);
  });

  it('resolveFeatures in index.ts assigns every FeatureFlags field', async () => {
    // Audit Lane A close-out: `resolveFeatures` only knew about
    // `supabase`. Adding a future field to FeatureFlags without an
    // assignment line here would leave the field stuck at the literal
    // initial value forever, which silently disables the flag. This
    // fence catches that.
    const [stripSrc, indexSrc] = await Promise.all([
      readFile(path.join(SRC_ROOT, 'strip-features.ts'), 'utf8'),
      readFile(path.join(SRC_ROOT, 'index.ts'), 'utf8'),
    ]);
    const declared = new Set(extractFeatureFlagFields(stripSrc));
    const resolved = extractResolvedFields(indexSrc);
    const missing: string[] = [];
    for (const f of declared) {
      if (!resolved.has(f)) missing.push(f);
    }
    expect(
      missing,
      `resolveFeatures never assigns these FeatureFlags fields: ${missing.join(
        ', '
      )}. Add a corresponding "if (argv.<field> !== undefined) flags.<field> = …" branch.`
    ).toEqual([]);
  });
});
