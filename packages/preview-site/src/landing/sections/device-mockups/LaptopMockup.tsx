/**
 * @file LaptopMockup.tsx
 * @description MacBook-style front view with a faux marketing site rendered
 * inside the screen. Stands in for the Web deployment shape.
 */

import { type MockupProps, BRAND, WARM_HALO, NEUTRAL } from './tokens';

// =============================================================================
// LaptopMockup — Web target
// =============================================================================

export function LaptopMockup({ active, className, ...rest }: MockupProps) {
  return (
    <svg
      viewBox="0 0 400 240"
      className={className}
      role="presentation"
      {...rest}
    >
      <defs>
        <linearGradient id="mock-web-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={NEUTRAL.screenBg} />
          <stop offset="100%" stopColor={NEUTRAL.screenDim} />
        </linearGradient>
        <linearGradient id="mock-web-cta" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.active} />
          <stop offset="100%" stopColor={BRAND.activeStrong} />
        </linearGradient>

        {/* "Powered on" inner backlight — a soft radial wash painted
            on top of the screen content. Brightens the centre of
            the display the way an LCD's backlight bleeds when the
            panel is lit, fading to nothing well before reaching the
            bezel so the content underneath stays readable.
            The hot core is a warm near-white (amber-50) so the
            panel reads "really lit" without dumping yellow tint
            onto the page content — the surrounding WARM_HALO
            carries the visible warm colour. */}
        <radialGradient
          id="mock-web-screen-bloom"
          cx="0.5"
          cy="0.42"
          r="0.78"
        >
          <stop offset="0%" stopColor={BRAND.glowHot} stopOpacity="0.45" />
          <stop offset="35%" stopColor={BRAND.glowHot} stopOpacity="0.18" />
          <stop offset="100%" stopColor={BRAND.glowHot} stopOpacity="0" />
        </radialGradient>

        {/* Far ambient glow — LAYERED 3-zone radial wash:
            tight saturated hot core (amber-300) → mid warm halo
            (amber-200) → pale ambient tail (amber-100) → nothing.
            Each zone uses its own opacity profile so the visitor
            reads "a light source at the device, glowing outward"
            rather than "a uniform yellow wash across the card".
            The hot stop only lives in the inner ~15% of the
            radius so it never feels "thick" — most of the card
            background sees only the mid + edge zones, both pale
            and low-opacity. */}
        <radialGradient
          id="mock-web-far-glow"
          cx="0.5"
          cy="0.45"
          r="0.95"
        >
          <stop offset="0%" stopColor={WARM_HALO.hot} stopOpacity="0.28" />
          <stop offset="10%" stopColor={WARM_HALO.hot} stopOpacity="0.20" />
          <stop offset="22%" stopColor={WARM_HALO.mid} stopOpacity="0.13" />
          <stop offset="45%" stopColor={WARM_HALO.mid} stopOpacity="0.06" />
          <stop offset="72%" stopColor={WARM_HALO.edge} stopOpacity="0.018" />
          <stop offset="100%" stopColor={WARM_HALO.edge} stopOpacity="0" />
        </radialGradient>

        {/* Mid halo blur — used by the bezel-shaped rect for the
            close-in atmospheric spill. Wide stdDev (18) so the
            halo's outer edge dissolves all the way into the
            far-ambient wash — no visible "second ring" around the
            device, just a diffuse warm bounce. */}
        <filter
          id="mock-web-halo-blur"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>

      {/* Layered outer glow — two soft passes painted from
          far-to-near, both in warm tungsten amber so the laptop
          looks like it's sitting in a dim room with its panel lit.
          The far-glow rect is oversized (480×340) so the radial's
          long-tail fall-off has room to fully dissolve into the
          card background — no visible "circle edge". The closer
          bezel-shaped halo gives the device a soft warm rim
          spilling onto the immediate background. */}
      {active && (
        <>
          <rect
            className="eikon-screen-glow"
            x="-40"
            y="-60"
            width="480"
            height="340"
            fill="url(#mock-web-far-glow)"
            pointerEvents="none"
          />
          <rect
            className="eikon-screen-glow"
            x="20"
            y="-2"
            width="360"
            height="220"
            rx="16"
            fill={WARM_HALO.mid}
            opacity="0.08"
            filter="url(#mock-web-halo-blur)"
            pointerEvents="none"
          />
        </>
      )}

      {/* Outer screen body */}
      <rect
        x="30"
        y="8"
        width="340"
        height="200"
        rx="10"
        fill={NEUTRAL.bezel}
        stroke={NEUTRAL.bezelEdge}
        strokeWidth="1.5"
      />

      {/* Camera notch hint */}
      <rect x="194" y="11" width="12" height="2" rx="1" fill="#1a1a25" />

      {/* Display surface */}
      <rect
        x="38"
        y="16"
        width="324"
        height="184"
        rx="4"
        fill="url(#mock-web-screen)"
      />

      {/* Browser chrome bar */}
      <rect x="38" y="16" width="324" height="20" fill={NEUTRAL.chrome} />
      <circle cx="50" cy="26" r="2.5" fill="#ff5f57" opacity="0.85" />
      <circle cx="62" cy="26" r="2.5" fill="#febc2e" opacity="0.85" />
      <circle cx="74" cy="26" r="2.5" fill="#28c840" opacity="0.85" />
      <rect x="130" y="20" width="140" height="12" rx="6" fill="#22222e" />
      <rect x="160" y="24" width="80" height="4" rx="1.5" fill={NEUTRAL.textDim} />

      {/* Page hero — headline, two subtitle lines */}
      <rect
        x="100"
        y="62"
        width="200"
        height="12"
        rx="2"
        fill={active ? NEUTRAL.text : '#9a9da8'}
        opacity={active ? 1 : 0.85}
      />
      <rect x="115" y="82" width="170" height="5" rx="1.5" fill={NEUTRAL.textDim} />
      <rect x="130" y="92" width="140" height="5" rx="1.5" fill={NEUTRAL.textDim} />

      {/* CTA buttons — primary is brand-tinted when active */}
      <rect
        x="146"
        y="112"
        width="50"
        height="20"
        rx="6"
        fill={active ? 'url(#mock-web-cta)' : '#3a3a4a'}
      />
      {active && (
        <rect
          x="146"
          y="112"
          width="50"
          height="20"
          rx="6"
          fill="none"
          stroke={BRAND.glow}
          strokeWidth="0.8"
          opacity="0.6"
        />
      )}
      <rect
        x="204"
        y="112"
        width="50"
        height="20"
        rx="6"
        fill="none"
        stroke={NEUTRAL.faintEdge}
        strokeWidth="1"
      />

      {/* Deploy-target logo strip */}
      <g opacity={active ? 0.85 : 0.55}>
        <rect x="80" y="160" width="34" height="6" rx="1" fill={NEUTRAL.faint} />
        <rect x="124" y="160" width="42" height="6" rx="1" fill={NEUTRAL.faint} />
        <rect x="176" y="160" width="38" height="6" rx="1" fill={NEUTRAL.faint} />
        <rect x="224" y="160" width="42" height="6" rx="1" fill={NEUTRAL.faint} />
        <rect x="276" y="160" width="36" height="6" rx="1" fill={NEUTRAL.faint} />
      </g>

      {/* Inner screen backlight bloom — painted ON TOP of the
          content so the whole display "lights up", not just the
          background. Clipped to the screen rect's bounds via the
          same coordinates as the display surface above. */}
      {active && (
        <rect
          className="eikon-screen-glow"
          x="38"
          y="16"
          width="324"
          height="184"
          rx="4"
          fill="url(#mock-web-screen-bloom)"
        />
      )}

      {/* Active screen ring */}
      {active && (
        <rect
          x="38"
          y="16"
          width="324"
          height="184"
          rx="4"
          fill="none"
          stroke={BRAND.active}
          strokeWidth="1"
          opacity="0.5"
        />
      )}

      {/* Laptop base */}
      <path
        d="M 14 208 L 386 208 L 394 224 L 6 224 Z"
        fill={NEUTRAL.base}
        stroke={NEUTRAL.bezelEdge}
        strokeWidth="1"
      />
      {/* Hinge / trackpad hint */}
      <rect x="170" y="208" width="60" height="2" rx="1" fill={NEUTRAL.bezelEdge} />
      <ellipse cx="200" cy="219" rx="22" ry="1.2" fill="#262630" />

      {/* Keyboard spill — soft warm wash painted ON TOP of the
          laptop base, simulating screen light falling onto the
          palm-rest. Mid-amber and low-opacity so it reads as
          light landing on a surface, not a bright stripe glued on
          top of the trackpad. */}
      {active && (
        <ellipse
          className="eikon-screen-glow"
          cx="200"
          cy="214"
          rx="170"
          ry="8"
          fill={WARM_HALO.mid}
          opacity="0.07"
          filter="url(#mock-web-halo-blur)"
          pointerEvents="none"
        />
      )}
    </svg>
  );
}
