/**
 * @file MonitorMockup.tsx
 * @description External display on a stand, showing a faux code editor —
 * communicates "native desktop app" without needing to mock an OS-specific window.
 */

import { type MockupProps, BRAND, WARM_HALO, NEUTRAL, SYNTAX } from './tokens';

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
