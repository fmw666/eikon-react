/**
 * @file cli-schema-parity.test.ts
 * @description Drift fence between two hand-maintained mirrors of the same
 * variant-axis catalogue:
 *
 *   1. `packages/preview-site/src/lib/params-schema.ts`'s `PARAMS` array —
 *      the playground's source of truth.
 *   2. `packages/create-eikon-react/src/index.ts`'s `VARIANT_CHOICES` +
 *      `PLATFORM_OVERRIDES` — the CLI's mirror, kept inline so the CLI
 *      doesn't take a runtime dependency on the playground package.
 *
 * Both files document the synchronisation contract in their own header
 * comments; this test fails CI before silent drift can ship — adding a
 * value to one without the other becomes a red diff in code review.
 *
 * Strategy: read both source files via `fs` and parse the relevant
 * literals via regex. Same idiom as `skip-list-parity.test.ts` — keeps
 * the test free of cross-package TS imports (the CLI's tsconfig doesn't
 * include preview-site) and free of runtime dependency on either file's
 * compiled exports.
 */

// =================================================================================================
// Imports
// =================================================================================================

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// =================================================================================================
// Helpers
// =================================================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_PACKAGES = path.resolve(__dirname, '..', '..', '..');
const SCHEMA_PATH = path.resolve(
  REPO_PACKAGES,
  'preview-site',
  'src',
  'lib',
  'params-schema.ts'
);
const CLI_PATH = path.resolve(REPO_PACKAGES, 'create-eikon-react', 'src', 'index.ts');

/** Strip block and line comments so they don't trip our literal scans. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** Parse a flat `[ 'a', 'b', "c" ]` literal into an ordered string array. */
function parseStringArray(body: string): string[] {
  const out: string[] = [];
  const re = /['"`]([^'"`]+)['"`]/g;
  for (const m of body.matchAll(re)) out.push(m[1]!);
  return out;
}

/** Find a balanced [...] starting at the given offset; returns inner body. */
function readBracketed(source: string, openOffset: number): string {
  if (source[openOffset] !== '[') {
    throw new Error(`expected '[' at ${openOffset}`);
  }
  let depth = 0;
  for (let i = openOffset; i < source.length; i++) {
    const c = source[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return source.slice(openOffset + 1, i);
    }
  }
  throw new Error('unbalanced brackets');
}

/** Find a balanced {...} starting at the given offset; returns inner body. */
function readBraced(source: string, openOffset: number): string {
  if (source[openOffset] !== '{') {
    throw new Error(`expected '{' at ${openOffset}`);
  }
  let depth = 0;
  for (let i = openOffset; i < source.length; i++) {
    const c = source[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return source.slice(openOffset + 1, i);
    }
  }
  throw new Error('unbalanced braces');
}

interface SchemaEnumDef {
  id: string;
  values: string[];
  valuesWhen?: Record<string, string[]>;
  defaultWhen?: Record<string, string>;
}

/**
 * Parse `PARAMS = [...] as const satisfies …` from the schema source and
 * return the subset of fields this test cares about (id, values, optional
 * valuesWhen/defaultWhen). Boolean params are recognised by `kind: 'boolean'`
 * and skipped — they don't contribute to the CLI's enum mirror.
 */
function parseSchemaParams(source: string): SchemaEnumDef[] {
  const stripped = stripComments(source);
  const start = stripped.indexOf('PARAMS = [');
  if (start === -1) throw new Error('PARAMS = [ not found in schema');
  const inner = readBracketed(stripped, stripped.indexOf('[', start));
  const out: SchemaEnumDef[] = [];

  // Walk top-level `{ ... }` entries inside the array.
  let i = 0;
  while (i < inner.length) {
    const open = inner.indexOf('{', i);
    if (open === -1) break;
    const body = readBraced(inner, open);
    i = open + body.length + 2;

    const idMatch = body.match(/\bid:\s*['"`]([^'"`]+)['"`]/);
    const kindMatch = body.match(/\bkind:\s*['"`]([^'"`]+)['"`]/);
    if (!idMatch || !kindMatch) continue;
    if (kindMatch[1] !== 'enum') continue;

    const valuesIdx = body.indexOf('values:');
    if (valuesIdx === -1) continue;
    let cursor = body.indexOf('[', valuesIdx);
    let values: string[];
    if (cursor === -1) {
      // Inline reference like `values: PLATFORM_VALUES` — pick it up by
      // re-scanning the original source for `PLATFORM_VALUES = [...]`.
      const refMatch = body
        .slice(valuesIdx + 'values:'.length)
        .match(/^\s*([A-Z_][A-Z0-9_]*)/);
      if (!refMatch) continue;
      const refName = refMatch[1]!;
      const refStart = stripped.indexOf(`${refName} = [`);
      if (refStart === -1) {
        throw new Error(`schema: cannot resolve values reference ${refName}`);
      }
      values = parseStringArray(
        readBracketed(stripped, stripped.indexOf('[', refStart))
      );
    } else {
      values = parseStringArray(readBracketed(body, cursor));
    }

    const def: SchemaEnumDef = { id: idMatch[1]!, values };

    const vwIdx = body.indexOf('valuesWhen:');
    if (vwIdx !== -1) {
      const open = body.indexOf('{', vwIdx);
      if (open !== -1) {
        const vwBody = readBraced(body, open);
        const vw: Record<string, string[]> = {};
        const reKey = /(\w+)\s*:\s*\[/g;
        let m: RegExpExecArray | null;
        while ((m = reKey.exec(vwBody))) {
          const arrStart = vwBody.indexOf('[', m.index);
          vw[m[1]!] = parseStringArray(readBracketed(vwBody, arrStart));
        }
        def.valuesWhen = vw;
      }
    }
    const dwIdx = body.indexOf('defaultWhen:');
    if (dwIdx !== -1) {
      const open = body.indexOf('{', dwIdx);
      if (open !== -1) {
        const dwBody = readBraced(body, open);
        const dw: Record<string, string> = {};
        const re = /(\w+)\s*:\s*['"`]([^'"`]+)['"`]/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(dwBody))) dw[m[1]!] = m[2]!;
        def.defaultWhen = dw;
      }
    }
    cursor = -1;
    out.push(def);
  }
  return out;
}

interface CliMirror {
  variantChoices: Record<string, string[]>;
  platformOverrides: Record<
    string,
    Record<string, { values?: string[]; default?: string }>
  >;
}

/**
 * Parse `VARIANT_CHOICES = { … } satisfies …` and `PLATFORM_OVERRIDES = { … }`
 * from the CLI source. Same comment-stripping + balanced-brace strategy.
 */
function parseCliMirror(source: string): CliMirror {
  const stripped = stripComments(source);

  const vcStart = stripped.indexOf('VARIANT_CHOICES = {');
  if (vcStart === -1) throw new Error('VARIANT_CHOICES = { not found in CLI');
  const vcBody = readBraced(stripped, stripped.indexOf('{', vcStart));
  const variantChoices: Record<string, string[]> = {};
  // Each top-level entry: `<name>: [ ... ] as const,`
  const reAxis = /(\w+)\s*:\s*\[/g;
  let m: RegExpExecArray | null;
  while ((m = reAxis.exec(vcBody))) {
    const arrStart = vcBody.indexOf('[', m.index);
    variantChoices[m[1]!] = parseStringArray(readBracketed(vcBody, arrStart));
  }

  const poStart = stripped.indexOf('PLATFORM_OVERRIDES');
  if (poStart === -1) {
    throw new Error('PLATFORM_OVERRIDES not found in CLI');
  }
  const poOpen = stripped.indexOf('{', poStart);
  const poBody = readBraced(stripped, poOpen);
  const platformOverrides: CliMirror['platformOverrides'] = {};
  // Top-level: `<axis>: { ... },`
  let cursor = 0;
  while (cursor < poBody.length) {
    const colon = poBody.indexOf(':', cursor);
    if (colon === -1) break;
    const axisMatch = poBody.slice(cursor, colon).match(/(\w+)\s*$/);
    if (!axisMatch) break;
    const axisName = axisMatch[1]!;
    const open = poBody.indexOf('{', colon);
    if (open === -1) break;
    const axisBody = readBraced(poBody, open);
    cursor = open + axisBody.length + 2;

    const axisOverrides: Record<string, { values?: string[]; default?: string }> =
      {};
    // Per-platform body: `<platform>: { values: [...], default: '...' },`
    let pcursor = 0;
    while (pcursor < axisBody.length) {
      const pcolon = axisBody.indexOf(':', pcursor);
      if (pcolon === -1) break;
      const platMatch = axisBody.slice(pcursor, pcolon).match(/(\w+)\s*$/);
      if (!platMatch) break;
      const platName = platMatch[1]!;
      const popen = axisBody.indexOf('{', pcolon);
      if (popen === -1) break;
      const pbody = readBraced(axisBody, popen);
      pcursor = popen + pbody.length + 2;

      const entry: { values?: string[]; default?: string } = {};
      const valuesIdx = pbody.indexOf('values:');
      if (valuesIdx !== -1) {
        const arrStart = pbody.indexOf('[', valuesIdx);
        if (arrStart !== -1) {
          entry.values = parseStringArray(readBracketed(pbody, arrStart));
        }
      }
      const defMatch = pbody.match(/default:\s*['"`]([^'"`]+)['"`]/);
      if (defMatch) entry.default = defMatch[1]!;
      axisOverrides[platName] = entry;
    }
    platformOverrides[axisName] = axisOverrides;
  }
  return { variantChoices, platformOverrides };
}

// =================================================================================================
// Tests
// =================================================================================================

describe('CLI ↔ schema parity', () => {
  let schema: SchemaEnumDef[];
  let cli: CliMirror;

  it('reads both source files', async () => {
    const [s, c] = await Promise.all([
      readFile(SCHEMA_PATH, 'utf8'),
      readFile(CLI_PATH, 'utf8'),
    ]);
    schema = parseSchemaParams(s);
    cli = parseCliMirror(c);
    expect(schema.length).toBeGreaterThan(0);
    expect(Object.keys(cli.variantChoices).length).toBeGreaterThan(0);
  });

  it('every schema enum axis appears in CLI VARIANT_CHOICES with the same values', () => {
    // CLI omits `pm` (it's prompted via a separate codepath that lives
    // outside the variant resolution loop). Everything else must round-trip.
    const cliOnlyAxes = new Set<string>();
    const schemaOnlyAxes = new Set<string>();
    const valueDiffs: string[] = [];

    const schemaIds = new Set(schema.map((d) => d.id));
    const cliIds = new Set(Object.keys(cli.variantChoices));

    for (const id of cliIds) {
      if (!schemaIds.has(id) && id !== 'pm') cliOnlyAxes.add(id);
    }
    for (const def of schema) {
      if (def.id === 'pm') continue; // intentional CLI omission
      if (!cliIds.has(def.id)) {
        schemaOnlyAxes.add(def.id);
        continue;
      }
      const cliValues = cli.variantChoices[def.id]!;
      if (cliValues.join(',') !== def.values.join(',')) {
        valueDiffs.push(
          `axis "${def.id}": schema=[${def.values.join(',')}] cli=[${cliValues.join(',')}]`
        );
      }
    }

    expect(
      [...cliOnlyAxes],
      `CLI declares axes the schema doesn't know about: ${[...cliOnlyAxes].join(', ')}`
    ).toEqual([]);
    expect(
      [...schemaOnlyAxes],
      `Schema declares axes the CLI doesn't know about: ${[...schemaOnlyAxes].join(', ')}`
    ).toEqual([]);
    expect(valueDiffs, valueDiffs.join('\n')).toEqual([]);
  });

  it('schema valuesWhen / defaultWhen mirror CLI PLATFORM_OVERRIDES', () => {
    const valueDiffs: string[] = [];
    const defaultDiffs: string[] = [];
    const missingInCli: string[] = [];
    const missingInSchema: string[] = [];

    for (const def of schema) {
      if (def.id === 'platform' || def.id === 'pm') continue;
      const cliAxis = cli.platformOverrides[def.id];
      // The CLI keeps every enum axis as a key in PLATFORM_OVERRIDES, even
      // if the value is `{}` (no per-platform override). This makes the
      // mirror exhaustive — adding a schema axis without considering its
      // platform behaviour fails this assertion.
      if (!cliAxis) {
        missingInCli.push(def.id);
        continue;
      }
      const schemaPlatforms = new Set([
        ...Object.keys(def.valuesWhen ?? {}),
        ...Object.keys(def.defaultWhen ?? {}),
      ]);
      const cliPlatforms = new Set(Object.keys(cliAxis));

      for (const p of schemaPlatforms) {
        const schemaVals = def.valuesWhen?.[p];
        const schemaDef = def.defaultWhen?.[p];
        const cliEntry = cliAxis[p];
        if (!cliEntry && (schemaVals || schemaDef)) {
          missingInCli.push(`${def.id}/${p}`);
          continue;
        }
        if (
          schemaVals &&
          (cliEntry?.values?.join(',') ?? '') !== schemaVals.join(',')
        ) {
          valueDiffs.push(
            `axis "${def.id}" platform=${p}: schema valuesWhen=[${schemaVals.join(',')}] cli values=[${(cliEntry?.values ?? []).join(',')}]`
          );
        }
        if (schemaDef && cliEntry?.default !== schemaDef) {
          defaultDiffs.push(
            `axis "${def.id}" platform=${p}: schema defaultWhen=${schemaDef} cli default=${cliEntry?.default}`
          );
        }
      }
      for (const p of cliPlatforms) {
        if (schemaPlatforms.has(p)) continue;
        const entry = cliAxis[p];
        if (entry && (entry.values || entry.default)) {
          missingInSchema.push(`${def.id}/${p}`);
        }
      }
    }

    expect(missingInCli, missingInCli.join(', ')).toEqual([]);
    expect(missingInSchema, missingInSchema.join(', ')).toEqual([]);
    expect(valueDiffs, valueDiffs.join('\n')).toEqual([]);
    expect(defaultDiffs, defaultDiffs.join('\n')).toEqual([]);
  });

  it('platform values list itself is identical', () => {
    const schemaPlatform = schema.find((d) => d.id === 'platform');
    expect(schemaPlatform).toBeDefined();
    const cliPlatform = cli.variantChoices.platform;
    expect(cliPlatform).toBeDefined();
    expect(cliPlatform).toEqual(schemaPlatform!.values);
  });
});
