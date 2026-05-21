// =================================================================================================
// Common style tokens — the three chromes share the same Apple-ish palette
// =================================================================================================

export const APPLE_TOKENS = {
  bodyDark: '#0a0a0a',
  trafficClose: '#ff5f57',
  trafficMin: '#febc2e',
  trafficMax: '#28c840',
  trafficStroke: 'rgba(0,0,0,0.18)',
  windowBorder: 'rgba(0,0,0,0.18)',
  titleBarBg: 'linear-gradient(180deg, #f0f0f0 0%, #d6d6d6 100%)',
  titleBarBgDark: 'linear-gradient(180deg, #2c2c2e 0%, #1c1c1e 100%)',
  titleColor: '#1d1d1f',
  titleColorDark: '#f5f5f7',
  urlBarBg: '#fff',
  urlBarBorder: '#e5e5ea',
  urlBarTextSecondary: '#86868b',
  urlBarTextPrimary: '#1d1d1f',
  bodyShadow:
    '0 1px 2px rgba(0,0,0,0.04), 0 24px 48px -12px rgba(0,0,0,0.25), 0 8px 16px -8px rgba(0,0,0,0.18)',
} as const;

/**
 * iPhone 15/16 Pro-flavoured token palette. The frame reads as a single
 * piece of brushed dark titanium rather than the old multi-ringed
 * gasket — closer to the real Pro chassis and to the reference mock
 * provided for this redesign.
 *
 * Two visual elements compose the frame:
 *
 *   1. `bodyGradient` — a vertical, near-monochrome gradient on the
 *                       outer body. Top is a touch lighter (catches
 *                       light from above), bottom is a touch deeper.
 *                       Painted as `background` on the body div.
 *   2. `screen border` — a hairline (0.5px) ring of `screenBorder`
 *                       around the inner screen, painted as a
 *                       1px `outline`. This is the only seam between
 *                       glass and titanium and is intentionally subtle.
 *
 * Highlights are layered on top via two thin gradient strips (top edge
 * + left/right side sheens) rather than baked into the body, so they
 * can be tuned independently without disturbing the base colour.
 */
export const PHONE_TOKENS = {
  bodyTop: '#3a3d44',          // brushed dark titanium top edge
  bodyMid: '#26282d',          // mid-section, slightly cooler
  bodyBottom: '#1a1c20',       // bottom edge, deeper for grounding
  screenBorder: 'rgba(0,0,0,0.85)',
  edgeHighlight: 'rgba(255,255,255,0.32)',
  edgeShadow: 'rgba(0,0,0,0.55)',
  button: '#2b2d32',           // mute / volume / power keys
  buttonHighlight: 'rgba(255,255,255,0.18)',
  islandBg: '#000',
  statusFg: '#fff',
  homeIndicator: 'rgba(255,255,255,0.95)',
  bodyShadow:
    '0 1px 2px rgba(0,0,0,0.06), 0 36px 72px -18px rgba(0,0,0,0.55), 0 16px 36px -12px rgba(0,0,0,0.3)',
} as const;
