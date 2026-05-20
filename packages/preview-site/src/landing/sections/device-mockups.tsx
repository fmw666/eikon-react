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
// Cool slate (Tailwind slate-200…slate-500 range). These are SVG-internal
// hex strings rather than `var(--color-brand-*)` because SVG attribute
// values don't resolve CSS custom properties in older Safari/Firefox
// kernels, and the mockups need to render identically everywhere they
// appear (landing card, screenshots, share previews, etc.).
// =============================================================================

const BRAND = {
  active: '#cbd5e1',
  activeStrong: '#94a3b8',
  activeSoft: 'rgba(148, 163, 184, 0.18)',
  glow: 'rgba(203, 213, 225, 0.40)',
};

const NEUTRAL = {
  bezel: '#0d0d14',
  bezelEdge: '#2a2a36',
  base: '#1a1a24',
  screenBg: '#0f0f18',
  screenDim: '#13131e',
  chrome: '#1a1a26',
  text: '#cdd0d8',
  textDim: '#5a5d68',
  faint: '#2c2c38',
  faintEdge: '#3a3a4a',
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
            bezel so the content underneath stays readable. */}
        <radialGradient
          id="mock-web-screen-bloom"
          cx="0.5"
          cy="0.42"
          r="0.65"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* Outer halo blur — used by the rect painted *behind* the
            laptop body so a softened brand-tinted bloom appears to
            leak out of the screen and onto the desk surface around
            it. Filter region is generous (-30%/-30% to 130%/130%)
            so the blur isn't clipped at the rectangle's bounds. */}
        <filter
          id="mock-web-halo-blur"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
        >
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Outer screen halo — sits BEHIND the bezel so the blur
          spills outside the laptop's silhouette only. Only mounted
          when the card is the active selection; the
          `eikon-screen-glow` class fades it in with the bootup
          keyframe. */}
      {active && (
        <rect
          className="eikon-screen-glow"
          x="20"
          y="-2"
          width="360"
          height="220"
          rx="14"
          fill={BRAND.active}
          opacity="0.14"
          filter="url(#mock-web-halo-blur)"
        />
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
        <linearGradient id="mock-desk-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10101a" />
          <stop offset="100%" stopColor="#0a0a12" />
        </linearGradient>

        {/* Inner backlight bloom — see `mock-web-screen-bloom` for
            the full rationale. Cx/Cy nudged slightly upward so the
            wash centres above the editor's status bar (the focal
            content row), not on the empty bottom area. */}
        <radialGradient
          id="mock-desk-screen-bloom"
          cx="0.5"
          cy="0.38"
          r="0.7"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.10" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* Outer halo blur for the monitor surround. */}
        <filter
          id="mock-desk-halo-blur"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
        >
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Outer screen halo — sits behind the monitor body. */}
      {active && (
        <rect
          className="eikon-screen-glow"
          x="30"
          y="-4"
          width="340"
          height="214"
          rx="14"
          fill={BRAND.active}
          opacity="0.14"
          filter="url(#mock-desk-halo-blur)"
        />
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

      {/* Code lines — each row is a sequence of "syntax-highlighted"
          tokens. We use three slate tints (300 / 400 / 500) instead
          of literal keyword-purple / string-cyan / number-amber so
          the editor reads as a styled mono surface, not a rainbow. */}
      <g>
        {/* Line 1 - import */}
        <rect x="76" y="55" width="30" height="3" rx="0.5" fill="#94a3b8" />
        <rect x="110" y="55" width="60" height="3" rx="0.5" fill={NEUTRAL.text} />
        <rect x="174" y="55" width="40" height="3" rx="0.5" fill="#64748b" />

        {/* Line 2 - blank-ish */}

        {/* Line 3 - keyword + identifier */}
        <rect x="76" y="77" width="36" height="3" rx="0.5" fill="#94a3b8" />
        <rect x="116" y="77" width="50" height="3" rx="0.5" fill="#cbd5e1" />
        <rect x="170" y="77" width="20" height="3" rx="0.5" fill={NEUTRAL.text} />

        {/* Line 4 - active line (brand-coloured when card is active) */}
        <rect x="86" y="88" width="40" height="3" rx="0.5" fill="#94a3b8" />
        <rect
          x="130"
          y="88"
          width="80"
          height="3"
          rx="0.5"
          fill={active ? BRAND.active : '#64748b'}
          opacity={active ? 1 : 0.6}
        />
        <rect x="214" y="88" width="30" height="3" rx="0.5" fill="#cbd5e1" />

        {/* Line 5 */}
        <rect x="86" y="99" width="56" height="3" rx="0.5" fill="#cbd5e1" />
        <rect x="146" y="99" width="34" height="3" rx="0.5" fill={NEUTRAL.text} />
        <rect x="184" y="99" width="50" height="3" rx="0.5" fill="#64748b" />

        {/* Line 6 */}
        <rect x="86" y="110" width="44" height="3" rx="0.5" fill="#94a3b8" />

        {/* Line 7 */}
        <rect x="76" y="121" width="20" height="3" rx="0.5" fill="#94a3b8" />
        <rect x="100" y="121" width="64" height="3" rx="0.5" fill={NEUTRAL.text} />

        {/* Line 8 */}
        <rect x="86" y="132" width="50" height="3" rx="0.5" fill="#cbd5e1" />
        <rect x="140" y="132" width="38" height="3" rx="0.5" fill={NEUTRAL.text} />

        {/* Line 9 */}
        <rect x="86" y="143" width="32" height="3" rx="0.5" fill="#94a3b8" />

        {/* Line 10 - closing brace */}
        <rect x="76" y="154" width="6" height="3" rx="0.5" fill={NEUTRAL.text} />
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
      <rect x="48" y="170" width="304" height="22" fill="#0a0a12" />
      {/* Status indicator — was a vivid green "running" dot; toned
          down to slate so the editor footer stays monochrome. */}
      <rect x="56" y="178" width="6" height="3" rx="0.5" fill="#cbd5e1" />
      <rect x="68" y="178" width="90" height="3" rx="0.5" fill={NEUTRAL.textDim} />
      <rect x="166" y="178" width="60" height="3" rx="0.5" fill={NEUTRAL.text} />

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

        {/* Inner backlight bloom for each phone — see Laptop's
            `mock-web-screen-bloom` for the full rationale. Shared
            by both phones because at this scale the centre offset
            doesn't differ enough between lock-screen and home-grid
            to warrant two separate gradients. */}
        <radialGradient
          id="mock-mob-screen-bloom"
          cx="0.5"
          cy="0.42"
          r="0.7"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* Outer halo blur for the phone surround. Phones are
            smaller targets than the laptop/monitor, so we use a
            slightly tighter blur (stdDev 5 vs. 6) — keeps the
            spill from washing across the gap between the two
            handsets, which would read as "one big blob" rather
            than two lit devices. */}
        <filter
          id="mock-mob-halo-blur"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
        >
          <feGaussianBlur stdDeviation="5" />
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
      {/* Outer screen halo — behind the bezel so the blur spills
          outside the phone's silhouette only. */}
      {active && (
        <rect
          className="eikon-screen-glow"
          x="-8"
          y="-8"
          width="136"
          height="236"
          rx="24"
          fill={BRAND.active}
          opacity="0.14"
          filter="url(#mock-mob-halo-blur)"
        />
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
