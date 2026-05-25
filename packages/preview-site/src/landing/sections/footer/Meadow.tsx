// =============================================================================
// Meadow easter egg
//
// A hidden strip of grass that grows out from underneath the giant
// EIKON · REACT wordmark — but ONLY where the visitor's mouse-follow
// spotlight passes over it. The whole layer is masked by the same
// circular gradient that drives the spotlight, so the grass is
// completely invisible until someone slides their cursor down to the
// wordmark and discovers it.
//
// A single tiny flower lives at the far right end of the meadow as
// a second-order easter egg: if the visitor keeps dragging the
// spotlight all the way to the end of "REACT", a single pink bloom
// reveals itself. Reward for curiosity.
// =============================================================================

import { type CSSProperties, type Ref, useCallback, useState } from 'react';

/**
 * Deterministic "random" grass blade descriptors.
 *
 * We can't use Math.random() here — the meadow renders on first paint
 * and the layout needs to be stable across re-renders, hot reloads
 * and SSR/CSR (so blades don't visibly jitter when React hydrates).
 * Instead each blade derives its position / height / sway / colour
 * from its index via cheap prime-mod arithmetic. 70 blades is dense
 * enough to read as a continuous meadow at the wordmark's width
 * without overpaying for paths the visitor will mostly never see.
 *
 * - `x`         horizontal position in viewBox units (0–100)
 * - `height`    blade height in viewBox units (taller = peeks higher
 *               into the wordmark letters)
 * - `sway`     lateral tip offset, mimics gentle wind direction
 * - `hue/sat/light` HSL components — varied per blade so the meadow
 *               reads as natural mixed tones rather than astroturf
 */
/**
 * Per-blade descriptors with paired dim/bright lightness values
 * and a depth `row` (0 = back, 1 = mid, 2 = front).
 *
 * The meadow renders the same 390 blades twice: once as a dim
 * "shadow" copy under a wide soft mask, once as a brighter
 * "highlight" copy under a tight mask centred on the cursor.
 * Stacking the bright copy over the dim copy through different
 * mask radii produces real-feeling light falloff — same blade,
 * green-grey at the rim of the spotlight, fresh green at the
 * centre — without needing a real light shader.
 *
 * The 3-row depth split is what turns a flat strip of lines into
 * something that reads as actual ground texture:
 *
 *   - back row    short, hairline-thin, desaturated, ~65% opacity
 *                 → grass receding into haze behind the wordmark
 *   - mid row     medium height + weight, ~85% opacity
 *   - front row   tallest, thickest, fully opaque, brightest greens
 *                 → grass directly under the visitor's spotlight
 *
 * Painter's algorithm order (back → front via `SORTED_BLADES`
 * below) means tall front-row blades occlude the shorter back/mid
 * blades, producing visible parallax through the canopy. The 390-
 * blade count puts a fresh blade roughly every 2.5–4px of footer
 * width, dense enough to read as continuous lawn rather than
 * discernible individual stems.
 *
 * Front-row max height is intentionally tuned so the tallest tips
 * crest near 70% of the wordmark's cap height when the meadow
 * sits at its CSS `bottom` offset — i.e. the wordmark's lower
 * half is buried in grass and the brand name reads as *growing
 * out of the lawn*.
 *
 * - `x`            horizontal position in viewBox units (0–100)
 * - `height`       blade height in viewBox units (back: 14–22,
 *                  mid: 22–30, front: 30–38)
 * - `sway`         tip offset, small (±1.5) so blades stay
 *                  neatly upright like trimmed lawn grass
 * - `hue/sat`      shared HSL chroma — hue varies blade to blade
 *                  so the meadow reads as mixed tones, not astroturf
 * - `row`          depth bucket (0–2), drives width / opacity /
 *                  lightness scaling
 * - `strokeWidth`  blade weight in viewBox units; non-scaling-
 *                  stroke maps this to literal device pixels
 * - `rowOpacity`   atmospheric haze on far rows
 * - `shadeLight`   HSL lightness for the dim layer
 * - `lightLight`   HSL lightness for the bright layer
 */
// Simple deterministic hash for pseudo-random per-blade variation.
function hash(seed: number): number {
  let h = seed * 2654435761;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = (h >>> 16) ^ h;
  return (h >>> 0) / 4294967296; // 0..1
}

const BLADE_COUNT = 520;

const GRASS_BLADES = Array.from({ length: BLADE_COUNT }, (_, i) => {
  const h0 = hash(i);
  const h1 = hash(i + 1000);
  const h2 = hash(i + 2000);
  const h3 = hash(i + 3000);
  const h4 = hash(i + 4000);
  const h5 = hash(i + 5000);
  const h6 = hash(i + 6000);

  // Position: base even distribution + jitter for clumping
  const baseX = (i / (BLADE_COUNT - 1)) * 100;
  const x = baseX + (h0 - 0.5) * 2.8;

  // Row: weighted random (more mid/front, fewer back)
  const rowRoll = h1;
  const row = rowRoll < 0.25 ? 0 : rowRoll < 0.55 ? 1 : 2;

  // Height: wider variation per row
  const baseHeight = row === 0 ? 12 : row === 1 ? 20 : 28;
  const height = baseHeight + h2 * (row === 0 ? 10 : row === 1 ? 14 : 16);

  // Sway: much more varied, some blades lean hard
  const sway = (h3 - 0.5) * (row === 2 ? 4.5 : row === 1 ? 3.5 : 2.5);

  // Hue: wide spread — olive (75) through emerald (145), some yellowish
  const hue = 75 + h4 * 70;

  // Saturation: very varied — dry/pale (18%) to vibrant (58%)
  const sat = 18 + h5 * 40;

  const strokeWidth =
    row === 0 ? 0.5 + h6 * 0.3 : row === 1 ? 0.75 + h6 * 0.4 : 1.0 + h6 * 0.5;
  const rowOpacity = row === 0 ? 0.55 + h6 * 0.15 : row === 1 ? 0.75 + h6 * 0.15 : 0.9 + h6 * 0.1;

  const shadeLight =
    row === 0
      ? 6 + h2 * 8
      : row === 1
        ? 12 + h2 * 10
        : 18 + h2 * 14;
  const lightLight =
    row === 0
      ? 22 + h2 * 12
      : row === 1
        ? 34 + h2 * 16
        : 44 + h2 * 20;

  return {
    x,
    height,
    sway,
    hue,
    sat,
    row,
    strokeWidth,
    rowOpacity,
    shadeLight,
    lightLight,
  };
});

// Painter's algorithm: render back rows first so taller front-row
// blades naturally occlude shorter ones behind them. Sorted once
// at module load so the meadow doesn't re-sort on every render.
const SORTED_BLADES = [...GRASS_BLADES].sort((a, b) => a.row - b.row);

/**
 * Render one full grass SVG using a chooser function to pick the
 * HSL lightness per blade. Extracted so the dim "shade" layer and
 * the bright "light" layer share blade geometry exactly (essential
 * — if their paths drifted by even half a pixel the stacked illusion
 * of a single blade lit unevenly would break into a visible
 * doubled silhouette).
 *
 * The `mode` prop only affects the soil band tint underneath the
 * grass (deeper / damper in the highlight pass, almost-black in
 * the shadow pass). Without the soil band the meadow looks like
 * grass floating over the page background; with it, the blades
 * have somewhere to be rooted.
 */
function GrassBlades({
  pickLightness,
  mode,
}: {
  pickLightness: (g: (typeof GRASS_BLADES)[number]) => number;
  mode: 'shade' | 'light';
}) {
  const soilId = `eikon-meadow-soil-${mode}`;
  const soilTopAlpha = mode === 'shade' ? 0 : 0;
  const soilBottomAlpha = mode === 'shade' ? 0.55 : 0.9;
  const soilBottomColor =
    mode === 'shade'
      ? `hsl(28 28% 6% / ${soilBottomAlpha})`
      : `hsl(28 32% 13% / ${soilBottomAlpha})`;
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 60"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id={soilId}
          x1="0"
          y1="48"
          x2="0"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset="0%"
            stopColor={`hsl(28 28% 6% / ${soilTopAlpha})`}
          />
          <stop offset="100%" stopColor={soilBottomColor} />
        </linearGradient>
      </defs>
      {/* Soil band — sits behind the blades, fades upward into the
          page so the meadow blends instead of butting against a
          hard line. Slightly oversized x so the band reaches the
          mask's feathered edge. */}
      <rect
        x="-2"
        y="48"
        width="104"
        height="14"
        fill={`url(#${soilId})`}
      />
      {SORTED_BLADES.map((g, i) => {
        const tipX = g.x + g.sway;
        const tipY = 60 - g.height;
        // Vary the control point height to create different curvatures
        const bend = 0.45 + hash(i + 7000) * 0.25;
        const ctrlX = g.x + g.sway * (0.3 + hash(i + 8000) * 0.4);
        const ctrlY = 60 - g.height * bend;
        return (
          <path
            key={i}
            d={`M ${g.x} 60 Q ${ctrlX} ${ctrlY} ${tipX} ${tipY}`}
            stroke={`hsl(${g.hue} ${g.sat}% ${pickLightness(g)}%)`}
            strokeWidth={g.strokeWidth}
            strokeLinecap="round"
            fill="none"
            vectorEffect="non-scaling-stroke"
            opacity={g.rowOpacity}
          />
        );
      })}
    </svg>
  );
}

export function Meadow({
  ref,
  onLitChange,
}: {
  ref: Ref<HTMLDivElement>;
  onLitChange?: (lit: boolean) => void;
}) {
  const [phase, setPhase] = useState<'idle' | 'lit' | 'dimming'>('idle');

  const handleFlowerClick = useCallback(() => {
    setPhase('lit');
    onLitChange?.(true);
    setTimeout(() => setPhase('dimming'), 4000);
    setTimeout(() => {
      setPhase('idle');
      onLitChange?.(false);
    }, 5600);
  }, [onLitChange]);

  const meadowClass =
    'eikon-footer-meadow' +
    (phase === 'lit' ? ' eikon-meadow-lit' : '') +
    (phase === 'dimming' ? ' eikon-meadow-lit eikon-meadow-dimming' : '');

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={meadowClass}
      style={
        {
          '--eikon-meadow-mx': '-9999px',
          '--eikon-meadow-my': '-9999px',
        } as CSSProperties
      }
    >
      {/* Dim outer layer — visible across the wide soft halo of the
          spotlight, simulating the grass that's *almost* in shadow. */}
      <div className="eikon-footer-meadow__shade">
        <GrassBlades
          mode="shade"
          pickLightness={(g) => g.shadeLight}
        />
      </div>

      {/* Bright inner layer — the hot spot. Tight mask + brighter
          greens, stacked over the shade layer so the cursor's centre
          reads as actually lit. */}
      <div className="eikon-footer-meadow__light">
        <GrassBlades
          mode="light"
          pickLightness={(g) => g.lightLight}
        />
      </div>

      {/* Flower layer — covers the whole meadow so its mask shares
          the same coordinate origin as the grass layers above. Only
          paints one tiny flower at the right end of the meadow. */}
      <div className="eikon-footer-meadow__flower">
        <InteractiveFlower onBurst={handleFlowerClick} />
      </div>
    </div>
  );
}

const PETAL_COLORS = [
  'hsl(338 62% 68%)',
  'hsl(338 55% 75%)',
  'hsl(48 82% 62%)',
  'hsl(330 60% 60%)',
  'hsl(108 38% 45%)',
  'hsl(28 70% 65%)',
];

function InteractiveFlower({ onBurst }: { onBurst: () => void }) {
  const [blooming, setBlooming] = useState(false);
  const [particles, setParticles] = useState<
    Array<{ id: number; angle: number; dist: number; rot: number; color: string }>
  >([]);

  const handleClick = useCallback(() => {
    setBlooming(true);
    onBurst();
    const newParticles = Array.from({ length: 14 }, (_, i) => {
      const angle = (i / 14) * 360 + (Math.random() - 0.5) * 25;
      const dist = 18 + Math.random() * 14;
      const rot = (Math.random() - 0.5) * 180;
      const color = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
      return { id: Date.now() + i, angle, dist, rot, color };
    });
    setParticles(newParticles);

    setTimeout(() => setBlooming(false), 600);
    setTimeout(() => setParticles([]), 1200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      type="button"
      className={`eikon-footer-flower-btn${blooming ? ' eikon-flower-blooming' : ''}`}
      onClick={handleClick}
      aria-label="Hidden flower easter egg"
    >
      <Flower />
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const px = Math.cos(rad) * p.dist;
        const py = Math.sin(rad) * p.dist * -1;
        return (
          <span
            key={p.id}
            className="eikon-petal-particle"
            style={{
              '--px': `${px}px`,
              '--py': `${py}px`,
              '--pr': `${p.rot}deg`,
              backgroundColor: p.color,
            } as CSSProperties}
          />
        );
      })}
    </button>
  );
}

/**
 * The end-of-meadow flower. Rendered as its own SVG in an HTML layer
 * (rather than inside the stretched meadow SVG) so it keeps its
 * proportions — otherwise `preserveAspectRatio="none"` would squash
 * the petals into ovals as the footer gets wider.
 */
function Flower() {
  return (
    <svg
      aria-hidden="true"
      className="eikon-footer-flower"
      viewBox="0 0 24 48"
      style={{ position: 'relative', width: '100%', height: 'auto' }}
    >
      <path
        d="M12 48 Q10.5 32 12 16"
        stroke="hsl(110 38% 30%)"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M12 32 Q5 30 3.5 26 Q9 26.5 12 30 Z"
        fill="hsl(108 38% 32%)"
      />
      <path
        d="M12 40 Q19 38 20.5 34 Q15 34.5 12 38 Z"
        fill="hsl(108 38% 32%)"
      />
      <g transform="translate(12 11)">
        <ellipse
          cx="0"
          cy="-5"
          rx="3"
          ry="4.2"
          fill="hsl(338 62% 68%)"
        />
        <ellipse
          cx="4.6"
          cy="-1.5"
          rx="3"
          ry="4.2"
          fill="hsl(338 62% 68%)"
          transform="rotate(72 4.6 -1.5)"
        />
        <ellipse
          cx="2.9"
          cy="4"
          rx="3"
          ry="4.2"
          fill="hsl(338 62% 68%)"
          transform="rotate(144 2.9 4)"
        />
        <ellipse
          cx="-2.9"
          cy="4"
          rx="3"
          ry="4.2"
          fill="hsl(338 62% 68%)"
          transform="rotate(216 -2.9 4)"
        />
        <ellipse
          cx="-4.6"
          cy="-1.5"
          rx="3"
          ry="4.2"
          fill="hsl(338 62% 68%)"
          transform="rotate(288 -4.6 -1.5)"
        />
        <circle cx="0" cy="0" r="2.2" fill="hsl(48 82% 62%)" />
      </g>
    </svg>
  );
}
