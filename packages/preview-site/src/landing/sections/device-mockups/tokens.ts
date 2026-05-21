/**
 * @file tokens.ts
 * @description Shared types and palette constants used by all device mockups.
 */

import type { SVGProps } from 'react';

export interface MockupProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  /** Whether the parent platform card is the active selection. */
  active: boolean;
}

// =============================================================================
// Brand palette — keep in one spot so re-skinning is a single diff.
//
// Warm amber accent + warm tungsten halo. These are SVG-internal hex
// strings rather than `var(--color-brand-*)` because SVG attribute
// values don't resolve CSS custom properties in older Safari/Firefox
// kernels, and the mockups need to render identically everywhere they
// appear (landing card, screenshots, share previews, etc.).
//
// Two layers carry the "powered on, warm room" mood:
//
//   - `BRAND`     → UI accents painted INSIDE the device (CTA pill,
//                   active editor line, hero app icon, screen ring).
//                   Sits in the amber-200…amber-500 range so each
//                   accent harmonises with the warm halo around it.
//   - `WARM_HALO` → Ambient kelvin spill painted OUTSIDE / AROUND
//                   the device (far-glow radial, bezel-shaped halo,
//                   keyboard / desk light pool). A warm tungsten
//                   yellow that simulates the way a real lit panel
//                   bounces incandescent light onto the wall behind
//                   it and the surface below it.
// =============================================================================

export const BRAND = {
  active: '#fcd34d',
  activeStrong: '#f59e0b',
  activeSoft: 'rgba(252, 211, 77, 0.22)',
  glow: 'rgba(253, 224, 71, 0.55)',
  // Inner-bloom hot core. Deliberately a near-neutral warm white
  // (amber-50 territory) rather than a saturated yellow, so the
  // bloom painted on top of the screen content reads as "the panel
  // turned on" instead of "someone poured honey on the screen" —
  // the surrounding WARM_HALO carries the visible yellow tone.
  glowHot: '#fff7e6',
};

// Warm tungsten halo — the "wall behind the monitor" colour. Painted
// as a 3-zone radial wash behind/around each device so the surrounding
// card surface picks up the warm spill the way a real lit screen
// bounces light onto its environment.
//
// Three stops, three roles — this is what creates the LAYERED
// "I can see where the light source is" read instead of a flat
// uniform wash:
//
//   - `hot`  → amber-300, the small bright core directly behind
//              the device panel. Saturated enough to look like the
//              actual emitting source.
//   - `mid`  → amber-200, the visible warm halo wrapping around
//              the bright core. Where most of the "warm" colour
//              lives, perceptually.
//   - `edge` → amber-100, the long pale tail that dissolves into
//              the card background. Low chroma so the brain still
//              reads it as "reflected ambient", not pigment.
//
// Each stop sits at a different RADIUS in the gradient, with
// opacity dropping faster than radius grows. Net effect: a clear
// hot point, a soft layered glow, and a clean dissolve — i.e.
// "a lamp on", not "a yellow rectangle painted on the card".
export const WARM_HALO = {
  hot: '#fcd34d',
  mid: '#fde68a',
  edge: '#fef3c7',
};

export const NEUTRAL = {
  bezel: '#0d0d14',
  bezelEdge: '#2a2a36',
  base: '#1a1a24',
  // Screen base nudged a half-stop brighter than before. The bloom
  // wash painted on top does most of the "lit panel" work, but a
  // pitch-black base undercut it — bumping the base lets the panel
  // read as "on" even before the radial bloom finishes fading in.
  screenBg: '#15151f',
  screenDim: '#181824',
  chrome: '#1a1a26',
  text: '#e2e8f0',
  textDim: '#5a5d68',
  faint: '#2c2c38',
  faintEdge: '#3a3a4a',
};

// =============================================================================
// Code-editor syntax palette — used by the MonitorMockup so the
// editor surface reads as a real lit IDE (purple keywords, cyan
// strings, blue identifiers, amber numbers) instead of a row of
// uniform grey bars. The amber `number` stop is intentionally the
// same hue family as the warm halo, so the brightest in-screen
// token ties into the ambient glow rather than fighting it.
// =============================================================================

export const SYNTAX = {
  keyword: '#c084fc',
  identifier: '#60a5fa',
  string: '#5eead4',
  number: '#fcd34d',
  comment: '#64748b',
  text: '#e2e8f0',
};
