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
 */

import { describe, expect, it } from 'vitest';

import { INNER_BASE_STYLE } from '../constants';
import deviceShellCss from '../../../../styles/device-shell.css?raw';

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
  const blockMatch = deviceShellCss.match(/\.eikon-stack-card\s*\{([^}]*)\}/);
  const block = blockMatch?.[1] ?? '';

  it('defines a .eikon-stack-card rule block', () => {
    expect(blockMatch).not.toBeNull();
  });

  it('includes backface-visibility: hidden (the property that needs the blur fix)', () => {
    expect(block).toMatch(/backface-visibility\s*:\s*hidden/);
  });

  it('includes filter: blur(0) AA fix for the rotated outer layer', () => {
    expect(block).toMatch(/filter\s*:\s*blur\(\s*0(?:px)?\s*\)/);
  });
});

