/**
 * @file rendering-quality.test.ts
 * @description Guards rendering-critical CSS properties on ScaledDeviceShell
 * that look like no-ops but are required for visual quality.
 *
 * Context: the inner wrapper of each device card uses `backface-visibility:
 * hidden` + `will-change: transform` for GPU compositing during card
 * transitions. This combination causes Chromium to skip subpixel
 * anti-aliasing on the layer boundary, making border-radius curves on the
 * rotated/scaled side cards visibly jagged ("wavy" device borders).
 *
 * `filter: blur(0px)` forces a filter-effect context that overrides the
 * degraded AA path — it's visually zero but structurally essential.
 * This test prevents future perf sweeps from removing it as dead code.
 *
 * The same AA degradation applies to the OUTER `.eikon-stack-card` button
 * layer in device-shell.css, which also has `backface-visibility: hidden`
 * and is the layer that actually performs the rotate(±deg) for side cards.
 * Without `filter: blur(0)` on that selector too, the side cards' rotated
 * border-radius rasterizes jagged even when the inner layer is clean.
 *
 * Separately, `.eikon-shimmer-hover` and `.eikon-tab-flash` use
 * `mix-blend-mode: plus-lighter` on a transformed ::before. Safari/WebKit
 * has a long-standing bug where overflow:hidden + border-radius alone
 * fails to clip such descendants — the diagonal streak bleeds past the
 * host's rounded corners as a rectangle. The fix is a full-cover mask
 * layer (`-webkit-mask-image: -webkit-radial-gradient(white, black)`),
 * which is visually a no-op but forces WebKit's real clip-path codepath.
 * Guard the mask declarations so they survive future sweeps too.
 */

import { describe, expect, it } from 'vitest';

import { INNER_BASE_STYLE } from '../constants';
import deviceShellCss from '../../../../styles/device-shell.css?raw';
import effectsCss from '../../../../styles/effects.css?raw';

const SAFARI_MASK_RE =
  /-webkit-mask-image\s*:\s*-webkit-radial-gradient\(\s*white\s*,\s*black\s*\)/;

function extractRule(css: string, selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? null;
}

describe('ScaledDeviceShell rendering quality', () => {
  it('INNER_BASE_STYLE includes blur(0px) filter for anti-aliasing on GPU layers', () => {
    expect(INNER_BASE_STYLE).toHaveProperty('filter');
    expect(INNER_BASE_STYLE.filter).toBe('blur(0px)');
  });

  it('INNER_BASE_STYLE includes backfaceVisibility (the property that needs the blur fix)', () => {
    expect(INNER_BASE_STYLE).toHaveProperty('backfaceVisibility', 'hidden');
  });
});

describe('.eikon-stack-card rendering quality', () => {
  const block = extractRule(deviceShellCss, '.eikon-stack-card');

  it('defines a .eikon-stack-card rule block', () => {
    expect(block).not.toBeNull();
  });

  it('includes backface-visibility: hidden (the property that needs the blur fix)', () => {
    expect(block).toMatch(/backface-visibility\s*:\s*hidden/);
  });

  it('includes filter: blur(0) AA fix for the rotated outer layer', () => {
    expect(block).toMatch(/filter\s*:\s*blur\(\s*0(?:px)?\s*\)/);
  });
});

describe('Safari border-radius clip fix (mix-blend-mode + transform)', () => {
  const tabFlash = extractRule(deviceShellCss, '.eikon-tab-flash');
  const shimmerHover = extractRule(effectsCss, '.eikon-shimmer-hover');

  it('.eikon-tab-flash includes the WebKit mask hack', () => {
    expect(tabFlash).not.toBeNull();
    expect(tabFlash).toMatch(SAFARI_MASK_RE);
  });

  it('.eikon-shimmer-hover includes the WebKit mask hack', () => {
    expect(shimmerHover).not.toBeNull();
    expect(shimmerHover).toMatch(SAFARI_MASK_RE);
  });
});

