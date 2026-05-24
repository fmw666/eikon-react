/**
 * @file PhonesMockup.tsx
 * @description Two iPhone-shaped devices fanned slightly, one on a lockscreen,
 * the other on a home grid.
 */

import type { ReactNode } from 'react';

import { type MockupProps, BRAND, WARM_HALO, NEUTRAL } from './tokens';

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
      {/* Island camera lens */}
      <circle cx="68" cy="17" r="2.5" fill="#0c0c14" stroke="rgba(60,65,80,0.35)" strokeWidth="0.5" />
      <circle cx="68" cy="17" r="1.2" fill="rgba(20,30,50,0.8)" />
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
