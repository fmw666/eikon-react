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
 */

import { describe, expect, it } from 'vitest';

import { INNER_BASE_STYLE } from '../ScaledDeviceShell';

describe('ScaledDeviceShell rendering quality', () => {
  it('INNER_BASE_STYLE includes blur(0px) filter for anti-aliasing on GPU layers', () => {
    expect(INNER_BASE_STYLE).toHaveProperty('filter');
    expect(INNER_BASE_STYLE.filter).toBe('blur(0px)');
  });

  it('INNER_BASE_STYLE includes backfaceVisibility (the property that needs the blur fix)', () => {
    expect(INNER_BASE_STYLE).toHaveProperty('backfaceVisibility', 'hidden');
  });
});
