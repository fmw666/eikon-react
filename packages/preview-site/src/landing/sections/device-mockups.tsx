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
// =============================================================================

const BRAND = {
  active: '#a78bfa',
  activeStrong: '#8b5cf6',
  activeSoft: 'rgba(139, 92, 246, 0.20)',
  glow: 'rgba(167, 139, 250, 0.55)',
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
      </defs>

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
      </defs>

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

      {/* Code lines — each row is a sequence of coloured tokens */}
      <g>
        {/* Line 1 - import */}
        <rect x="76" y="55" width="30" height="3" rx="0.5" fill="#c084fc" />
        <rect x="110" y="55" width="60" height="3" rx="0.5" fill={NEUTRAL.text} />
        <rect x="174" y="55" width="40" height="3" rx="0.5" fill="#94a3b8" />

        {/* Line 2 - blank-ish */}

        {/* Line 3 - keyword + identifier */}
        <rect x="76" y="77" width="36" height="3" rx="0.5" fill="#c084fc" />
        <rect x="116" y="77" width="50" height="3" rx="0.5" fill="#7dd3fc" />
        <rect x="170" y="77" width="20" height="3" rx="0.5" fill={NEUTRAL.text} />

        {/* Line 4 - active line (brand-coloured when card is active) */}
        <rect x="86" y="88" width="40" height="3" rx="0.5" fill="#94a3b8" />
        <rect
          x="130"
          y="88"
          width="80"
          height="3"
          rx="0.5"
          fill={active ? BRAND.active : '#a78bfa'}
          opacity={active ? 1 : 0.5}
        />
        <rect x="214" y="88" width="30" height="3" rx="0.5" fill="#fbbf24" />

        {/* Line 5 */}
        <rect x="86" y="99" width="56" height="3" rx="0.5" fill="#7dd3fc" />
        <rect x="146" y="99" width="34" height="3" rx="0.5" fill={NEUTRAL.text} />
        <rect x="184" y="99" width="50" height="3" rx="0.5" fill="#fbbf24" />

        {/* Line 6 */}
        <rect x="86" y="110" width="44" height="3" rx="0.5" fill="#94a3b8" />

        {/* Line 7 */}
        <rect x="76" y="121" width="20" height="3" rx="0.5" fill="#c084fc" />
        <rect x="100" y="121" width="64" height="3" rx="0.5" fill={NEUTRAL.text} />

        {/* Line 8 */}
        <rect x="86" y="132" width="50" height="3" rx="0.5" fill="#7dd3fc" />
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
      <rect x="56" y="178" width="6" height="3" rx="0.5" fill="#10b981" />
      <rect x="68" y="178" width="90" height="3" rx="0.5" fill={NEUTRAL.textDim} />
      <rect x="166" y="178" width="60" height="3" rx="0.5" fill={NEUTRAL.text} />

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
        <linearGradient id="mock-mob-wall1" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#2e1065" />
          <stop offset="50%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#0a0a1f" />
        </linearGradient>
        <linearGradient id="mock-mob-wall2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#0c0c1c" />
        </linearGradient>
      </defs>

      {/* Back phone — slightly rotated, partially hidden behind the front phone.
        Shows a lockscreen with time. */}
      <g transform="translate(218 12) rotate(6 60 110)">
        <Phone wallFill="url(#mock-mob-wall1)">
          <PhoneLockscreenChildren active={active} />
        </Phone>
      </g>

      {/* Front phone — straight, dominant. Shows the home grid. */}
      <g transform="translate(98 16) rotate(-3 60 110)">
        <Phone wallFill="url(#mock-mob-wall2)">
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
 */
function Phone({
  children,
  wallFill,
}: {
  children: ReactNode;
  wallFill: string;
}) {
  return (
    <g>
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
  // App icon palette: a mix of muted tones so the brand-coloured "your
  // app" icon stands out without being the only thing visible.
  const palette = [
    '#ef4444',
    '#f97316',
    '#eab308',
    '#10b981',
    '#06b6d4',
    '#3b82f6',
    '#a855f7',
    '#ec4899',
    '#22c55e',
    '#0ea5e9',
    '#f59e0b',
    '#8b5cf6',
    '#84cc16',
    '#14b8a6',
    '#d946ef',
    '#fb7185',
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
              fill={isHero ? BRAND.activeStrong : palette[i % palette.length]}
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
