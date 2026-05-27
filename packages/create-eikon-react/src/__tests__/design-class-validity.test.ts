/**
 * @file design-class-validity.test.ts
 * @description `inject-html-variants.ts` paints the chosen design preset
 *  onto `<html>` as a class name shaped `design-<value>`. The same value
 *  also has to match a `:root.design-<value>` block in `template-react/
 *  src/styles/index.css`. Two ways this can break silently:
 *
 *    1. A future contributor adds a value with whitespace, dots, or
 *       capital letters — the resulting class either fails to parse, or
 *       parses to the wrong thing. CSS selectors don't tolerate this.
 *    2. A value lands in `VARIANT_CHOICES.design` but no matching CSS
 *       block exists, leaving the user's HTML with a class that selects
 *       nothing (the design "applies" but no tokens override the base
 *       palette).
 *
 *  The test enforces both: each design value must match a strict
 *  CSS-identifier regex AND must have a `:root.design-<value>` rule
 *  inside `index.css`.
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

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..');
const CLI_INDEX = path.join(PACKAGE_ROOT, 'src', 'index.ts');
const STYLES_CSS = path.join(
  REPO_ROOT,
  'template-react',
  'src',
  'styles',
  'index.css'
);

const CSS_IDENT_RE = /^[a-z][a-z0-9-]*$/;

/** Pull `design: [ ... ]` out of `VARIANT_CHOICES`. */
function extractDesignValues(source: string): string[] {
  const start = source.indexOf('VARIANT_CHOICES = {');
  if (start === -1) throw new Error('VARIANT_CHOICES not found');
  const designIdx = source.indexOf('design:', start);
  if (designIdx === -1) throw new Error('design key not found');
  const arrStart = source.indexOf('[', designIdx);
  const arrEnd = source.indexOf(']', arrStart);
  const body = source.slice(arrStart + 1, arrEnd);
  const out: string[] = [];
  for (const m of body.matchAll(/['"]([A-Za-z0-9_-]+)['"]/g)) {
    out.push(m[1]!);
  }
  if (out.length === 0) throw new Error('no design values extracted');
  return out;
}

// =================================================================================================
// Tests
// =================================================================================================

describe('design class validity', () => {
  it('every design value is a valid CSS identifier suffix', async () => {
    const cliSrc = await readFile(CLI_INDEX, 'utf8');
    const values = extractDesignValues(cliSrc);
    for (const v of values) {
      expect(
        CSS_IDENT_RE.test(v),
        `design value "${v}" is not a valid CSS identifier — ` +
          `must match /^[a-z][a-z0-9-]*$/ to safely become \`design-${v}\``
      ).toBe(true);
    }
  });

  it('every design value has a matching :root.design-<value> rule in index.css', async () => {
    const [cliSrc, css] = await Promise.all([
      readFile(CLI_INDEX, 'utf8'),
      readFile(STYLES_CSS, 'utf8'),
    ]);
    const values = extractDesignValues(cliSrc);
    for (const v of values) {
      if (v === 'default') continue; // baseline lives in plain :root, no class suffix.
      const needle = `:root.design-${v}`;
      expect(
        css.includes(needle),
        `index.css missing "${needle}" rule — preset declared in ` +
          `VARIANT_CHOICES.design but no token overrides exist`
      ).toBe(true);
    }
  });
});
