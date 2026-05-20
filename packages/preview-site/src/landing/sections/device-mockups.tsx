/**
 * @file device-mockups.tsx
 * @description Inline SVG device mockups used by the PlatformPicker rich
 * cards. One per shipping target:
 *
 *   - `LaptopMockup`   → MacBook-style front view with a faux marketing
 *                        site rendered inside the screen. Stands in for
 *                        the Web deployment shape.
 *   - `MonitorMockup`  → External display on a stand, showing a faux
 *                        code editor — communicates "native desktop app"
 *                        without needing to mock an OS-specific window.
 *   - `PhonesMockup`   → Two iPhone-shaped devices fanned slightly, one
 *                        on a lockscreen, the other on a home grid.
 *
 * All three render into the same `viewBox 0 0 400 240` (≈ 5:3) so the
 * outer card can use a single `aspect-[5/3]` container and the visuals
 * always centre nicely regardless of which platform card the visitor
 * is looking at.
 *
 * The `active` prop drives a subtle "this is the selected target"
 * highlight inside each scene — a glowing CTA button on the laptop,
 * a brand-coloured code line on the monitor, a glowing app icon on
 * the phone. Inactive variants render the same scene in greyscale
 * tones so the active card always reads as "lit up" by comparison.
 *
 * SVG ids are namespaced (`mock-web-*`, `mock-desk-*`, etc.) because
 * gradient/pattern ids in SVG share a global page-wide namespace, and
 * generic names would collide once these are used together.
 */

import { type ReactNode, type SVGProps } from 'react';

interface MockupProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
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

const BRAND = {
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
const WARM_HALO = {
  hot: '#fcd34d',
  mid: '#fde68a',
  edge: '#fef3c7',
};

const NEUTRAL = {
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

const SYNTAX = {
  keyword: '#c084fc',
  identifier: '#60a5fa',
  string: '#5eead4',
  number: '#fcd34d',
  comment: '#64748b',
  text: '#e2e8f0',
};

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

// =============================================================================
// MonitorMockup — Desktop target
// =============================================================================

export function MonitorMockup({ active, className, ...rest }: MockupProps) {
  return (
    <svg
      viewBox="0 0 400 240"
      className={className}
      role="presentation"
      {...rest}
    >
      <defs>
        {/* Screen base — nudged a hair brighter than before so the
            panel reads as "really on" rather than a pitch-black
            glass plate that the bloom is trying to fake light onto.
            The bloom radial above still does most of the lit-panel
            work; this base just gives it a non-zero floor. */}
        <linearGradient id="mock-desk-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1c28" />
          <stop offset="100%" stopColor="#101019" />
        </linearGradient>

        {/* Inner backlight bloom — soft warm-white wash painted on
            top of the editor content. Cx/Cy nudged slightly upward
            so the wash centres above the status bar (the focal
            content row), not on the empty bottom area. Hot core is
            a near-neutral warm white (amber-50) so the panel reads
            as "really lit" without dumping yellow tint onto the
            code — the WARM_HALO around the device carries the
            visible warm colour. */}
        <radialGradient
          id="mock-desk-screen-bloom"
          cx="0.5"
          cy="0.4"
          r="0.78"
        >
          <stop offset="0%" stopColor={BRAND.glowHot} stopOpacity="0.42" />
          <stop offset="35%" stopColor={BRAND.glowHot} stopOpacity="0.18" />
          <stop offset="100%" stopColor={BRAND.glowHot} stopOpacity="0" />
        </radialGradient>

        {/* Far ambient glow — LAYERED 3-zone warm wash (hot →
            mid → edge), same structural recipe as the laptop's
            `mock-web-far-glow`. The hot stop sits behind the
            panel as a small bright source, the mid carries the
            visible warm halo, and the edge fades into the card
            background as pale ambient. Bumped a hair more
            saturated than the laptop because the monitor is the
            tallest device in the trio — without the extra punch
            it would feel under-lit relative to its bezel size. */}
        <radialGradient
          id="mock-desk-far-glow"
          cx="0.5"
          cy="0.42"
          r="0.95"
        >
          <stop offset="0%" stopColor={WARM_HALO.hot} stopOpacity="0.32" />
          <stop offset="10%" stopColor={WARM_HALO.hot} stopOpacity="0.22" />
          <stop offset="22%" stopColor={WARM_HALO.mid} stopOpacity="0.14" />
          <stop offset="45%" stopColor={WARM_HALO.mid} stopOpacity="0.065" />
          <stop offset="72%" stopColor={WARM_HALO.edge} stopOpacity="0.02" />
          <stop offset="100%" stopColor={WARM_HALO.edge} stopOpacity="0" />
        </radialGradient>

        {/* Mid halo blur — wide stdDev so the outer edge dissolves
            cleanly into the far-ambient wash and never reads as a
            visible ring of light around the bezel. */}
        <filter
          id="mock-desk-halo-blur"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur stdDeviation="18" />
        </filter>

        {/* Desk pool blur — used by the elliptical wash painted
            UNDER the stand to simulate light landing on the desk
            surface. Wider stdDev (14) and a tall, narrow ellipse
            give the spill an unmistakable "pool of light" shape
            instead of a tight ring. */}
        <filter
          id="mock-desk-pool-blur"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* Layered outer glow — two soft passes (far-ambient +
          bezel-shaped halo), both in warm tungsten amber so the
          monitor reads as a panel lit in a dim room. The wash
          behind the device is the dominant "warm light on the
          wall" cue; the bezel-shaped halo gives the device a
          soft warm rim that ties it into that wider spill. */}
      {active && (
        <>
          <rect
            className="eikon-screen-glow"
            x="-30"
            y="-60"
            width="460"
            height="320"
            fill="url(#mock-desk-far-glow)"
            pointerEvents="none"
          />
          <rect
            className="eikon-screen-glow"
            x="30"
            y="-4"
            width="340"
            height="214"
            rx="14"
            fill={WARM_HALO.mid}
            opacity="0.08"
            filter="url(#mock-desk-halo-blur)"
            pointerEvents="none"
          />
          {/* Desk pool — a stretched ellipse sitting beneath the
              stand, simulating screen light landing on the desk
              surface. Mid-amber and low-opacity so it reads as
              a pool of spilled candlelight, not a bright shelf.
              Slightly stronger than the bezel halo because the
              radial gradient's hot core sits above the screen,
              not below it — this pool is what gives the bottom
              of the device its own little anchor of warm light. */}
          <ellipse
            className="eikon-screen-glow"
            cx="200"
            cy="232"
            rx="150"
            ry="10"
            fill={WARM_HALO.mid}
            opacity="0.12"
            filter="url(#mock-desk-pool-blur)"
            pointerEvents="none"
          />
        </>
      )}

      {/* Monitor body */}
      <rect
        x="40"
        y="6"
        width="320"
        height="194"
        rx="8"
        fill={NEUTRAL.bezel}
        stroke={NEUTRAL.bezelEdge}
        strokeWidth="1.5"
      />

      {/* Display surface */}
      <rect
        x="48"
        y="14"
        width="304"
        height="178"
        rx="3"
        fill="url(#mock-desk-screen)"
      />

      {/* Window title bar */}
      <rect x="48" y="14" width="304" height="18" fill={NEUTRAL.chrome} />
      <circle cx="60" cy="23" r="2.5" fill="#ff5f57" opacity="0.85" />
      <circle cx="72" cy="23" r="2.5" fill="#febc2e" opacity="0.85" />
      <circle cx="84" cy="23" r="2.5" fill="#28c840" opacity="0.85" />
      <rect x="160" y="19" width="80" height="6" rx="2" fill="#252532" />

      {/* File tabs */}
      <rect x="48" y="32" width="60" height="14" fill="#15151f" />
      <rect x="108" y="32" width="50" height="14" fill={NEUTRAL.screenBg} />
      <rect x="158" y="32" width="50" height="14" fill={NEUTRAL.screenBg} />
      <rect x="52" y="38" width="36" height="3" rx="1" fill={NEUTRAL.text} />

      {/* Editor body */}
      {/* Line numbers gutter */}
      <rect x="48" y="46" width="22" height="120" fill="#0c0c14" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <rect
          key={i}
          x="56"
          y={55 + i * 11}
          width="6"
          height="3"
          rx="0.5"
          fill={NEUTRAL.textDim}
          opacity="0.5"
        />
      ))}

      {/* Code lines — each row is a sequence of syntax-highlighted
          tokens (purple keyword, blue identifier, teal string,
          amber number, slate comment). Real IDE-style colour gives
          the screen the "really lit editor" read the visitor
          expects from a powered-on monitor, instead of the muted
          row-of-grey-bars look that made the panel feel off. The
          amber `number` stop is the same hue family as the warm
          halo around the device, so the brightest in-screen token
          ties into the surrounding glow rather than fighting it. */}
      <g>
        {/* Line 1 — import keyword + identifier + string + punctuation */}
        <rect x="76" y="55" width="30" height="3" rx="0.5" fill={SYNTAX.keyword} />
        <rect x="110" y="55" width="42" height="3" rx="0.5" fill={SYNTAX.identifier} />
        <rect x="156" y="55" width="14" height="3" rx="0.5" fill={SYNTAX.keyword} />
        <rect x="174" y="55" width="44" height="3" rx="0.5" fill={SYNTAX.string} />

        {/* Line 2 — single-line comment */}
        <rect x="76" y="66" width="86" height="3" rx="0.5" fill={SYNTAX.comment} />

        {/* Line 3 — `const name = "..."` */}
        <rect x="76" y="77" width="22" height="3" rx="0.5" fill={SYNTAX.keyword} />
        <rect x="104" y="77" width="40" height="3" rx="0.5" fill={SYNTAX.identifier} />
        <rect x="148" y="77" width="6" height="3" rx="0.5" fill={SYNTAX.text} />
        <rect x="160" y="77" width="48" height="3" rx="0.5" fill={SYNTAX.string} />

        {/* Line 4 — ACTIVE line. Whole row sits on a warm
            highlight band (the "current line" gutter wash editors
            use), with the inner token painted in the warm accent
            so it ties into the ambient glow. When the card isn't
            active everything falls back to muted slate. */}
        {active && (
          <rect
            x="48"
            y="85"
            width="304"
            height="9"
            fill={BRAND.active}
            opacity="0.08"
          />
        )}
        <rect x="86" y="88" width="32" height="3" rx="0.5" fill={SYNTAX.keyword} />
        <rect
          x="122"
          y="88"
          width="46"
          height="3"
          rx="0.5"
          fill={active ? BRAND.active : SYNTAX.identifier}
          opacity={active ? 1 : 0.7}
        />
        <rect x="172" y="88" width="6" height="3" rx="0.5" fill={SYNTAX.text} />
        <rect x="182" y="88" width="24" height="3" rx="0.5" fill={SYNTAX.number} />
        <rect x="210" y="88" width="38" height="3" rx="0.5" fill={SYNTAX.string} />

        {/* Line 5 — `if (count > 0) {` */}
        <rect x="86" y="99" width="14" height="3" rx="0.5" fill={SYNTAX.keyword} />
        <rect x="104" y="99" width="32" height="3" rx="0.5" fill={SYNTAX.identifier} />
        <rect x="140" y="99" width="6" height="3" rx="0.5" fill={SYNTAX.text} />
        <rect x="150" y="99" width="14" height="3" rx="0.5" fill={SYNTAX.number} />

        {/* Line 6 — `count += 1` (indented one extra level) */}
        <rect x="96" y="110" width="34" height="3" rx="0.5" fill={SYNTAX.identifier} />
        <rect x="134" y="110" width="8" height="3" rx="0.5" fill={SYNTAX.text} />
        <rect x="146" y="110" width="10" height="3" rx="0.5" fill={SYNTAX.number} />

        {/* Line 7 — `return result` */}
        <rect x="86" y="121" width="22" height="3" rx="0.5" fill={SYNTAX.keyword} />
        <rect x="112" y="121" width="44" height="3" rx="0.5" fill={SYNTAX.identifier} />

        {/* Line 8 — closing brace + comment */}
        <rect x="86" y="132" width="6" height="3" rx="0.5" fill={SYNTAX.text} />
        <rect x="100" y="132" width="74" height="3" rx="0.5" fill={SYNTAX.comment} />

        {/* Line 9 — function call */}
        <rect x="76" y="143" width="40" height="3" rx="0.5" fill={SYNTAX.identifier} />
        <rect x="120" y="143" width="24" height="3" rx="0.5" fill={SYNTAX.number} />
        <rect x="148" y="143" width="36" height="3" rx="0.5" fill={SYNTAX.string} />

        {/* Line 10 — closing punctuation */}
        <rect x="76" y="154" width="6" height="3" rx="0.5" fill={SYNTAX.text} />
      </g>

      {/* Cursor block on the active line — only when the card is active,
        so an inactive card doesn't look like it's "still running" in the
        background. */}
      {active && (
        <rect
          x="248"
          y="87"
          width="2"
          height="5"
          fill={BRAND.active}
          opacity="0.9"
        />
      )}

      {/* Bottom status / terminal strip */}
      <rect x="48" y="170" width="304" height="22" fill="#0c0c14" />
      {/* Status indicator — a small green "running" dot, the
          classic IDE / language-server cue. Adds one bright tiny
          colour accent at the bottom edge of the panel so the
          monitor reads as "powered on with something live happening
          inside it", reinforcing the lit-screen mood. */}
      <circle cx="58" cy="179" r="2" fill="#34d399" opacity="0.95" />
      <rect x="64" y="178" width="90" height="3" rx="0.5" fill={NEUTRAL.textDim} />
      <rect x="158" y="178" width="46" height="3" rx="0.5" fill={SYNTAX.identifier} opacity="0.85" />
      <rect x="210" y="178" width="32" height="3" rx="0.5" fill={NEUTRAL.text} />

      {/* Inner screen backlight bloom — painted over the editor
          content so the whole display reads as "lit up", not just
          its background. */}
      {active && (
        <rect
          className="eikon-screen-glow"
          x="48"
          y="14"
          width="304"
          height="178"
          rx="3"
          fill="url(#mock-desk-screen-bloom)"
        />
      )}

      {/* Active screen ring */}
      {active && (
        <rect
          x="48"
          y="14"
          width="304"
          height="178"
          rx="3"
          fill="none"
          stroke={BRAND.active}
          strokeWidth="1"
          opacity="0.5"
        />
      )}

      {/* Stand neck */}
      <rect
        x="186"
        y="200"
        width="28"
        height="22"
        fill={NEUTRAL.base}
        stroke={NEUTRAL.bezelEdge}
        strokeWidth="1"
      />
      {/* Stand base */}
      <ellipse
        cx="200"
        cy="228"
        rx="56"
        ry="6"
        fill={NEUTRAL.base}
        stroke={NEUTRAL.bezelEdge}
        strokeWidth="1"
      />
    </svg>
  );
}

// =============================================================================
// PhonesMockup — Mobile target
// =============================================================================

export function PhonesMockup({ active, className, ...rest }: MockupProps) {
  return (
    <svg
      viewBox="0 0 400 240"
      className={className}
      role="presentation"
      {...rest}
    >
      <defs>
        {/* Phone wallpapers — was a violet-indigo night gradient.
            Now uses dark slate stops so the phones harmonise with
            the rest of the mono palette. The two gradients keep
            their slight value variance so back/front phones still
            read as two separate devices. */}
        <linearGradient id="mock-mob-wall1" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="50%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="mock-mob-wall2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#172033" />
          <stop offset="100%" stopColor="#0a0d18" />
        </linearGradient>

        {/* Inner backlight bloom for each phone — soft warm-white
            wash painted on top of the wallpaper + content so the
            small panel reads as "really lit" without dumping
            yellow tint onto the icons. Shared by both phones
            because at this scale the centre offset doesn't differ
            enough between lock-screen and home-grid to warrant
            two separate gradients. */}
        <radialGradient
          id="mock-mob-screen-bloom"
          cx="0.5"
          cy="0.45"
          r="0.78"
        >
          <stop offset="0%" stopColor={BRAND.glowHot} stopOpacity="0.4" />
          <stop offset="40%" stopColor={BRAND.glowHot} stopOpacity="0.15" />
          <stop offset="100%" stopColor={BRAND.glowHot} stopOpacity="0" />
        </radialGradient>

        {/* Per-phone far ambient radial — LAYERED 3-zone warm
            wash (hot → mid → edge), same recipe as the laptop /
            monitor far-glows. Painted as a 200×300 rect behind
            each handset so the wash follows the individual phone's
            rotated transform — a tilted phone glows in the
            direction it's leaning. Opacities held a step below the
            laptop's because the phones sit side-by-side; if we
            ran the same numbers, the two halos would visibly
            bleed into each other in the middle of the card. */}
        <radialGradient
          id="mock-mob-far-glow"
          cx="0.5"
          cy="0.45"
          r="0.92"
        >
          <stop offset="0%" stopColor={WARM_HALO.hot} stopOpacity="0.24" />
          <stop offset="10%" stopColor={WARM_HALO.hot} stopOpacity="0.17" />
          <stop offset="22%" stopColor={WARM_HALO.mid} stopOpacity="0.11" />
          <stop offset="45%" stopColor={WARM_HALO.mid} stopOpacity="0.05" />
          <stop offset="72%" stopColor={WARM_HALO.edge} stopOpacity="0.014" />
          <stop offset="100%" stopColor={WARM_HALO.edge} stopOpacity="0" />
        </radialGradient>

        {/* Mid halo blur — tighter (stdDev 12) than the
            laptop/monitor (stdDev 18) because phones are smaller
            targets sitting side-by-side; an 18-stdDev blur would
            visibly merge the two handsets' halos into one. */}
        <filter
          id="mock-mob-halo-blur"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>

      {/* Back phone — slightly rotated, partially hidden behind the front phone.
        Shows a lockscreen with time. */}
      <g transform="translate(218 12) rotate(6 60 110)">
        <Phone wallFill="url(#mock-mob-wall1)" active={active}>
          <PhoneLockscreenChildren active={active} />
        </Phone>
      </g>

      {/* Front phone — straight, dominant. Shows the home grid. */}
      <g transform="translate(98 16) rotate(-3 60 110)">
        <Phone wallFill="url(#mock-mob-wall2)" active={active}>
          <PhoneHomescreenChildren active={active} />
        </Phone>
      </g>
    </svg>
  );
}

/**
 * Shared phone chassis — rounded rectangle with bezel, dynamic island,
 * status bar bones, and the home indicator. Children render the
 * screen-specific content (lockscreen vs. home grid).
 *
 * When `active` is true the phone gets two "powered on" overlays:
 *
 *   - An outer halo (Gaussian-blurred slate rect behind the bezel)
 *     that lets light appear to spill out of the screen onto the
 *     surrounding canvas.
 *   - An inner backlight bloom (soft radial wash painted on top of
 *     the wallpaper + content) so the whole display reads as lit,
 *     not just its frame.
 *
 * Both overlays share the `eikon-screen-glow` class which fades
 * them in over 500ms with a small overshoot — the "click — lit up"
 * power-on cue when the visitor selects the Mobile target card.
 */
function Phone({
  children,
  wallFill,
  active,
}: {
  children: ReactNode;
  wallFill: string;
  active: boolean;
}) {
  return (
    <g>
      {/* Layered outer glow — two soft passes (far-ambient +
          bezel-shaped halo) per handset, both in warm tungsten
          amber so each phone reads as a panel lit in a dim room.
          The per-phone rotation transform carries the glow along
          with the device, so a tilted phone glows in the direction
          it's leaning. */}
      {active && (
        <>
          <rect
            className="eikon-screen-glow"
            x="-40"
            y="-40"
            width="200"
            height="300"
            fill="url(#mock-mob-far-glow)"
            pointerEvents="none"
          />
          <rect
            className="eikon-screen-glow"
            x="-8"
            y="-8"
            width="136"
            height="236"
            rx="24"
            fill={WARM_HALO.mid}
            opacity="0.08"
            filter="url(#mock-mob-halo-blur)"
            pointerEvents="none"
          />
        </>
      )}

      {/* Bezel */}
      <rect
        x="0"
        y="0"
        width="120"
        height="220"
        rx="20"
        fill={NEUTRAL.bezel}
        stroke={NEUTRAL.bezelEdge}
        strokeWidth="1.2"
      />
      {/* Screen wallpaper */}
      <rect x="6" y="6" width="108" height="208" rx="14" fill={wallFill} />
      {/* Dynamic island */}
      <rect x="44" y="12" width="32" height="10" rx="5" fill="#0a0a14" />
      {/* Status bar — time + icons placeholders */}
      <rect x="14" y="14" width="14" height="3" rx="1" fill="#e5e7eb" opacity="0.8" />
      <rect x="92" y="14" width="14" height="3" rx="1" fill="#e5e7eb" opacity="0.6" />
      {/* Children sit between the status bar and the home indicator. */}
      {children}
      {/* Home indicator bar */}
      <rect
        x="42"
        y="206"
        width="36"
        height="3"
        rx="1.5"
        fill="#e5e7eb"
        opacity="0.7"
      />

      {/* Inner backlight bloom — painted last so it sits ON TOP of
          the lockscreen / home-grid content the children rendered.
          The whole display, including icons + widget cards, gets
          the soft glow wash. */}
      {active && (
        <rect
          className="eikon-screen-glow"
          x="6"
          y="6"
          width="108"
          height="208"
          rx="14"
          fill="url(#mock-mob-screen-bloom)"
          pointerEvents="none"
        />
      )}
    </g>
  );
}

/**
 * Lock-screen content for the back phone — large time, smaller date,
 * and a couple of widget cards.
 */
function PhoneLockscreenChildren({ active }: { active: boolean }) {
  return (
    <g>
      {/* Time "9:41" — rendered as solid bars so the look stays clean
        regardless of font availability. */}
      <rect x="30" y="42" width="60" height="22" rx="3" fill="#f9fafb" opacity="0.9" />
      <rect x="38" y="70" width="44" height="5" rx="1.5" fill="#cbd5e1" opacity="0.8" />

      {/* Two widget cards */}
      <rect
        x="14"
        y="100"
        width="44"
        height="44"
        rx="8"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.06)"
      />
      <rect x="20" y="106" width="20" height="3" rx="1" fill="#e5e7eb" opacity="0.7" />
      <rect x="20" y="113" width="28" height="5" rx="1.5" fill="#e5e7eb" opacity="0.9" />
      <rect x="20" y="124" width="24" height="3" rx="1" fill="#cbd5e1" opacity="0.6" />

      <rect
        x="62"
        y="100"
        width="44"
        height="44"
        rx="8"
        fill={active ? BRAND.activeSoft : 'rgba(255,255,255,0.08)'}
        stroke={active ? BRAND.glow : 'rgba(255,255,255,0.06)'}
      />
      <rect
        x="68"
        y="106"
        width="20"
        height="3"
        rx="1"
        fill={active ? BRAND.active : '#cbd5e1'}
      />
      <rect x="68" y="113" width="28" height="5" rx="1.5" fill="#e5e7eb" opacity="0.9" />
      <rect x="68" y="124" width="24" height="3" rx="1" fill="#cbd5e1" opacity="0.6" />

      {/* Flashlight / camera dock placeholders */}
      <circle cx="22" cy="186" r="8" fill="rgba(255,255,255,0.1)" />
      <circle cx="98" cy="186" r="8" fill="rgba(255,255,255,0.1)" />
    </g>
  );
}

/**
 * Home-screen content for the front phone — 4×5 grid of app icon
 * placeholders + a 4-slot dock. One slot uses the brand colour to
 * read as "your app", and pulses softly when the card is active.
 */
function PhoneHomescreenChildren({ active }: { active: boolean }) {
  // App icon palette: monochromatic slate at four lightness stops,
  // cycled so the grid has visual variety without painting any one
  // tile in a saturated colour. Reads as "muted UI placeholders"
  // (intentional, on-brand) rather than a real iOS rainbow.
  //
  // The "your app" hero slot uses a lighter slate (BRAND.active)
  // plus a ring stroke when active, so it remains clearly
  // distinguishable against this darker palette without us needing
  // to drop a coloured pop in.
  const palette = [
    '#475569',
    '#334155',
    '#64748b',
    '#3f3f46',
    '#52525b',
    '#475569',
    '#3f3f46',
    '#334155',
    '#64748b',
    '#475569',
    '#334155',
    '#52525b',
    '#3f3f46',
    '#475569',
    '#334155',
    '#64748b',
  ];
  const ROWS = 4;
  const COLS = 4;
  const CELL = 22;
  const GUTTER = 4;
  const GRID_W = COLS * CELL + (COLS - 1) * GUTTER;
  const GRID_X = (120 - GRID_W) / 2;
  const GRID_Y = 36;
  // Which slot is the "your app" highlighted icon. Picking a central
  // slot keeps it visible at this scale.
  const HERO_SLOT = 5;

  return (
    <g>
      {Array.from({ length: ROWS * COLS }).map((_, i) => {
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        const x = GRID_X + col * (CELL + GUTTER);
        const y = GRID_Y + row * (CELL + GUTTER);
        const isHero = i === HERO_SLOT;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              rx="6"
              fill={isHero ? BRAND.active : palette[i % palette.length]}
              opacity={isHero ? (active ? 1 : 0.85) : 0.7}
            />
            {isHero && active && (
              <rect
                x={x - 1}
                y={y - 1}
                width={CELL + 2}
                height={CELL + 2}
                rx="7"
                fill="none"
                stroke={BRAND.glow}
                strokeWidth="1.2"
                opacity="0.85"
              />
            )}
          </g>
        );
      })}

      {/* Dock background */}
      <rect
        x="14"
        y="166"
        width="92"
        height="32"
        rx="14"
        fill="rgba(255,255,255,0.08)"
      />
      {/* Dock icons */}
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={20 + i * 22}
          y={172}
          width="20"
          height="20"
          rx="5"
          fill={palette[(i * 3) % palette.length]}
          opacity="0.78"
        />
      ))}
    </g>
  );
}
