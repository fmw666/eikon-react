/**
 * @file inject-html-variants.ts
 * @description Stamps the chosen runtime axes onto the scaffolded `index.html`.
 *
 * Phase G of the runtime-variant refactor moved `design / ui / layout /
 * toastPosition` from compile-time strip-features to runtime React state
 * (CSS class on `<html>` for design/ui, React Context for layout). For
 * the playground iframe the shell pushes the active values via
 * postMessage, but for terminal users (`npx create-eikon-react ...`)
 * we need to bake in the picked values once at scaffold time so:
 *
 *   1. The first paint renders in the chosen design/ui without a flash —
 *      the CSS class is on `<html>` before any JS runs.
 *   2. The runtime initialisers in `src/main.tsx` and
 *      `src/app/LayoutVariantContext.tsx` (which read
 *      `<html data-design / data-ui / data-layout>`) resolve to the
 *      same value, so they're consistent regardless of whether the
 *      cascade-driven first paint already applied the class.
 *
 * `platform` is intentionally NOT mirrored to a `<html>` class /
 * `data-` attribute. Platform-specific behaviour is gated at scaffold
 * time by `@eikon:variant(platform=…)` strip markers (see
 * `90-platform-targets.md`); a runtime class would be a parallel
 * mechanism with no consumer. `toastPosition` is similarly inert at
 * scaffold time — its four-entry `INITIAL_POSITION` array is collapsed
 * by strip to the picked value.
 *
 * The transformation is a single regex on `<html lang="en">` so it
 * tolerates extra whitespace / future attributes the template might
 * gain — anything already present on the tag is preserved.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { VariantSelections } from './strip-features.js';

const HTML_OPEN_RE = /<html\b([^>]*)>/i;

/**
 * Build the attributes to splice onto `<html>` for the given variant
 * selection. `default` design / `animate-ui` ui collapse to "no class"
 * (matching the runtime contract in `template-react/src/main.tsx`'s
 * `applyClassAxis` helper). `data-layout` is always emitted because
 * `LayoutVariantContext` reads it as the initial value.
 *
 * Exposed for unit tests; the CLI itself only needs `injectHtmlVariants`.
 */
export function buildHtmlVariantAttrs(
  variants: VariantSelections
): { classes: string[]; dataAttrs: Record<string, string> } {
  const classes: string[] = [];
  const dataAttrs: Record<string, string> = {};

  const design = variants.design;
  if (design && design !== 'default') {
    classes.push(`design-${design}`);
    dataAttrs['data-design'] = design;
  }

  const ui = variants.ui;
  if (ui && ui !== 'animate-ui') {
    classes.push(`ui-${ui}`);
    dataAttrs['data-ui'] = ui;
  }

  const layout = variants.layout;
  if (layout) {
    dataAttrs['data-layout'] = layout;
  }

  return { classes, dataAttrs };
}

/**
 * Splice variant classes / data-attributes onto the `<html>` open tag.
 * Idempotent only on a freshly-copied template — re-running on output
 * that already carries variant attrs may stack class names. Callers
 * are expected to invoke this once per scaffold, after `copyTemplate`
 * and `stripFeatures`.
 *
 * Returns the rewritten HTML. Pure function; the writeable wrapper is
 * `injectHtmlVariants` below.
 */
export function rewriteHtmlOpenTag(
  raw: string,
  variants: VariantSelections
): string {
  const { classes, dataAttrs } = buildHtmlVariantAttrs(variants);
  if (classes.length === 0 && Object.keys(dataAttrs).length === 0) {
    return raw;
  }

  return raw.replace(HTML_OPEN_RE, (_match, existingAttrs: string) => {
    const trimmed = existingAttrs.trim();
    const parts: string[] = [];
    if (trimmed.length > 0) parts.push(trimmed);
    if (classes.length > 0) {
      parts.push(`class="${classes.join(' ')}"`);
    }
    for (const [k, v] of Object.entries(dataAttrs)) {
      parts.push(`${k}="${v}"`);
    }
    return `<html ${parts.join(' ')}>`;
  });
}

/**
 * Read `targetDir/index.html`, splice in the variant attrs, and write it
 * back. No-ops cleanly when the file is absent (e.g. minimal fixtures
 * in unit tests don't ship one) — the rest of the scaffold continues.
 */
export async function injectHtmlVariants(
  targetDir: string,
  variants: VariantSelections
): Promise<void> {
  const file = path.join(targetDir, 'index.html');
  let raw: string;
  try {
    raw = await readFile(file, 'utf8');
  } catch {
    return;
  }
  const next = rewriteHtmlOpenTag(raw, variants);
  if (next !== raw) {
    await writeFile(file, next, 'utf8');
  }
}
