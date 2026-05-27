import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildHtmlVariantAttrs,
  injectHtmlVariants,
  rewriteHtmlOpenTag,
} from '../inject-html-variants.js';
import { DEFAULT_VARIANTS } from '../strip-features.js';

const SAMPLE_HTML = `<!doctype html>
<html lang="en">
  <head><title>App</title></head>
  <body><div id="root"></div></body>
</html>
`;

describe('buildHtmlVariantAttrs', () => {
  it('emits only the layout data attr for the default scaffold', () => {
    const out = buildHtmlVariantAttrs({
      ...DEFAULT_VARIANTS,
      platform: 'web',
      design: 'default',
      ui: 'animate-ui',
      layout: 'stacked',
      toastPosition: 'top-right',
    });
    expect(out.classes).toEqual([]);
    // `data-layout` is always emitted because LayoutVariantContext reads
    // it unconditionally; this is the source of truth even for default.
    expect(out.dataAttrs).toEqual({ 'data-layout': 'stacked' });
  });

  it('emits design + ui classes and matching data attrs for non-defaults', () => {
    const out = buildHtmlVariantAttrs({
      ...DEFAULT_VARIANTS,
      platform: 'web',
      design: 'apple',
      ui: 'radix',
      layout: 'sidebar',
      toastPosition: 'top-right',
    });
    expect(out.classes).toEqual(['design-apple', 'ui-radix']);
    expect(out.dataAttrs).toEqual({
      'data-design': 'apple',
      'data-ui': 'radix',
      'data-layout': 'sidebar',
    });
  });

  it('does not stamp any platform attribute or class', () => {
    // Platform-specific behaviour is gated at scaffold time by
    // `@eikon:variant(platform=…)` strip markers; a runtime <html> class
    // would be a parallel mechanism with no consumer.
    const out = buildHtmlVariantAttrs({
      ...DEFAULT_VARIANTS,
      platform: 'mobile',
      design: 'default',
      ui: 'animate-ui',
      layout: 'mobile-drawer',
      toastPosition: 'top-right',
    });
    expect(out.classes).toEqual([]);
    expect(out.dataAttrs).toEqual({ 'data-layout': 'mobile-drawer' });
  });
});

describe('rewriteHtmlOpenTag', () => {
  it('preserves existing attributes on <html>', () => {
    const next = rewriteHtmlOpenTag(SAMPLE_HTML, {
      ...DEFAULT_VARIANTS,
      platform: 'web',
      design: 'apple',
      ui: 'radix',
      layout: 'sidebar',
      toastPosition: 'top-right',
    });
    expect(next).toContain(
      '<html lang="en" class="design-apple ui-radix" data-design="apple" data-ui="radix" data-layout="sidebar">'
    );
    // Original `<head>` content untouched.
    expect(next).toContain('<title>App</title>');
  });

  it('is a no-op when there are no attrs to inject', () => {
    // Even default still stamps `data-layout`; pick a fixture that yields
    // *zero* injected attrs to verify the no-op path.
    const next = rewriteHtmlOpenTag(SAMPLE_HTML, {
      ...DEFAULT_VARIANTS,
      platform: 'web',
      design: 'default',
      ui: 'animate-ui',
      // Empty layout signals "no attr to inject" for this regression
      // (callers always pass a real layout, but this protects the no-op
      // branch).
      layout: '',
      toastPosition: 'top-right',
    });
    expect(next).toBe(SAMPLE_HTML);
  });

  it('does not mention toastPosition or platform in the output', () => {
    const next = rewriteHtmlOpenTag(SAMPLE_HTML, {
      ...DEFAULT_VARIANTS,
      platform: 'mobile',
      design: 'default',
      ui: 'animate-ui',
      layout: 'stacked',
      toastPosition: 'bottom-center',
    });
    expect(next).not.toContain('toast');
    expect(next).not.toContain('platform');
    expect(next).toContain('data-layout="stacked"');
  });
});

describe('injectHtmlVariants', () => {
  it('rewrites the on-disk index.html', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'eikon-inject-html-'));
    try {
      const file = path.join(dir, 'index.html');
      await writeFile(file, SAMPLE_HTML, 'utf8');
      await injectHtmlVariants(dir, {
        ...DEFAULT_VARIANTS,
        platform: 'mobile',
        design: 'apple',
        ui: 'radix',
        layout: 'mobile-drawer',
        toastPosition: 'top-right',
      });
      const next = await readFile(file, 'utf8');
      expect(next).toContain(
        '<html lang="en" class="design-apple ui-radix" data-design="apple" data-ui="radix" data-layout="mobile-drawer">'
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('silently no-ops when index.html is missing', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'eikon-inject-html-'));
    try {
      // No file written — should not throw.
      await injectHtmlVariants(dir, {
        ...DEFAULT_VARIANTS,
        platform: 'web',
        design: 'apple',
        ui: 'radix',
        layout: 'sidebar',
        toastPosition: 'top-right',
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
