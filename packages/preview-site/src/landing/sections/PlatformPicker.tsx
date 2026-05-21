/**
 * @file PlatformPicker.tsx
 * @description "Choose your target" platform section.
 *
 * Two visual variants share the same store wiring:
 *
 *   - Default (landing page hero-adjacent): three device-shell cards
 *     STACKED on top of each other on a single stage — like a deck
 *     of tab cards. The selected platform sits centred and lifted
 *     (z-30, scale 1); the two siblings fan to the left and right
 *     behind it (translated, scaled down, rotated, dimmed). Each
 *     card carries its platform's editorial copy (title + long
 *     description + three bullets) RENDERED INSIDE THE DEVICE
 *     SCREEN itself — the browser tab shows web copy on a web page,
 *     the monitor shows desktop copy in a code-editor-like panel,
 *     the phone shows mobile copy as a mobile UI.
 *
 *     Tapping a non-active card promotes it to the centre; its
 *     screen then plays a one-shot "glass sweep" — a diagonal
 *     specular streak that crosses the panel ~900ms after the
 *     swap, reading as "the glass caught the light when you
 *     tipped the tab forward". The streak is keyed to a
 *     monotonically-incrementing nonce so the animation re-runs
 *     on every switch even when the same target is re-selected.
 *
 *   - Compact (used by `/playground` sidebar): three slim selectable
 *     rows (icon + label + check dot), sized to fit a ~320–380px
 *     sidebar. No bullets, no CTA, no tilt.
 *
 * The PlatformPicker visual is intentionally rich enough to double as
 * the "what does this template ship?" overview — previously two
 * separate sections (PlatformPicker + Outputs). Merging them removed
 * the duplicate "three platforms" pass that used to appear at the top
 * and again before the FAQ.
 */

import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { coercePlatform, type Platform } from '@/lib/params-schema';
import { DeviceShell, type DevicePlatform } from '@/shell/DeviceShell';
import { useShellStore } from '@/shell/store';

/** Resting low-brightness scrim for the centred card before any switch. */
const SCREEN_DIM_SCRIM = 'rgba(10, 10, 14, 0.58)';

/** Darker scrim for side / unselected cards — must match the hold stops
 *  in `eikon-screen-wake` so a brighten animation handoffs cleanly. */
const SCREEN_DIM_SCRIM_INACTIVE = 'rgba(10, 10, 14, 0.76)';

import { useI18n, type I18nKey } from '../theme/i18n';

// =============================================================================
// Option schema
// =============================================================================

interface PlatformOption {
  value: Platform;
  /** Short label used by the compact sidebar variant. */
  compactTitleKey: I18nKey;
  /** Short one-liner used by the compact sidebar variant. */
  compactDescKey: I18nKey;
  /** Long-form title shown in the rich landing card. */
  titleKey: I18nKey;
  /** Long-form description shown under the title in the rich card. */
  descKey: I18nKey;
  /** Three feature bullets shown under the description in the rich card. */
  bulletKeys: ReadonlyArray<I18nKey>;
  /** Inline SVG icon used by the compact sidebar variant. */
  Icon: (props: { className: string }) => ReactNode;
  /**
   * Text density flavour for the in-screen editorial copy. The mobile
   * shell's screen is much narrower than the browser/desktop ones, so
   * its `ScreenContent` collapses the description and tightens the
   * bullet list. We pass this in explicitly rather than relying on
   * container queries — the project doesn't ship Tailwind's container-
   * query plugin and this is one less moving piece to worry about.
   */
  density: 'wide' | 'narrow';
}

const OPTIONS: ReadonlyArray<PlatformOption> = [
  {
    value: 'web',
    compactTitleKey: 'platform.web.title',
    compactDescKey: 'platform.web.desc',
    titleKey: 'outputs.web.title',
    descKey: 'outputs.web.desc',
    bulletKeys: [
      'outputs.web.bullet1',
      'outputs.web.bullet2',
      'outputs.web.bullet3',
    ],
    Icon: WebIcon,
    density: 'wide',
  },
  {
    value: 'desktop',
    compactTitleKey: 'platform.desktop.title',
    compactDescKey: 'platform.desktop.desc',
    titleKey: 'outputs.desktop.title',
    descKey: 'outputs.desktop.desc',
    bulletKeys: [
      'outputs.desktop.bullet1',
      'outputs.desktop.bullet2',
      'outputs.desktop.bullet3',
    ],
    Icon: DesktopIcon,
    density: 'wide',
  },
  {
    value: 'mobile',
    compactTitleKey: 'platform.mobile.title',
    compactDescKey: 'platform.mobile.desc',
    titleKey: 'outputs.mobile.title',
    descKey: 'outputs.mobile.desc',
    bulletKeys: [
      'outputs.mobile.bullet1',
      'outputs.mobile.bullet2',
      'outputs.mobile.bullet3',
    ],
    Icon: MobileIcon,
    density: 'narrow',
  },
];

/** Anchor id used by the Hero CTA's smooth-scroll target. */
export const PLATFORM_PICKER_ANCHOR_ID = 'platform';

// =============================================================================
// Public component
// =============================================================================

export interface PlatformPickerProps {
  /**
   * Compact layout used by the dedicated /playground page sidebar:
   * a single column of slim selectable rows (icon + label + check),
   * sized to fit a 320–380px sidebar. Drops the section heading and
   * the marketing subtitle.
   *
   * Default (no flag) renders the rich landing layout — three large
   * cards with bullets, descriptions, and a CTA affordance.
   */
  compact?: boolean;
}

export function PlatformPicker({ compact = false }: PlatformPickerProps = {}) {
  const { t, lang } = useI18n();
  const current = useShellStore((s) => coercePlatform(s.state.platform));
  const setParam = useShellStore((s) => s.setParam);

  if (compact) {
    return (
      <div
        role="radiogroup"
        aria-label={t('platform.title')}
        className="flex flex-col gap-1.5"
      >
        {OPTIONS.map((opt) => {
          const active = opt.value === current;
          return (
            <CompactPlatformRow
              key={opt.value}
              active={active}
              title={t(opt.compactTitleKey)}
              desc={t(opt.compactDescKey)}
              Icon={opt.Icon}
              onSelect={() => setParam('platform', opt.value)}
            />
          );
        })}
      </div>
    );
  }

  return (
    <StackedStage
      current={current}
      onSelect={(p) => setParam('platform', p)}
      lang={lang}
      t={t}
    />
  );
}

// =============================================================================
// Stacked stage (default landing variant)
// =============================================================================

/**
 * Visual structure:
 *
 *   ┌─────────── Tabs row (Web · Desktop · Mobile) ────────────┐
 *   │                                                            │
 *   │   ╔════════════════════════════════════════════════════╗   │
 *   │   ║   [card-left]   [CARD-CENTER]   [card-right]       ║   │
 *   │   ║       ↘            (active)            ↙           ║   │
 *   │   ╚════════════════════════════════════════════════════╝   │
 *   │                                                            │
 *   │            ←  arrow-key hint  →                            │
 *   └────────────────────────────────────────────────────────────┘
 *
 * The three device-shells are absolutely positioned inside the same
 * stage; their `.eikon-stack-card` transition lets transform/opacity
 * tween in lockstep when `current` changes. A `glassNonce` counter
 * increments on every switch and is fed as a React `key` into the
 * GlassSweep overlay inside the centre card — that re-mounts the
 * overlay, which runs its keyframe once.
 */
function StackedStage({
  current,
  onSelect,
  lang,
  t,
}: {
  current: Platform;
  onSelect: (p: Platform) => void;
  lang: string;
  t: (key: I18nKey) => string;
}) {
  const activeIdx = useMemo(
    () => OPTIONS.findIndex((o) => o.value === current),
    [current]
  );

  // Monotonic nonce — re-keys the centre card's GlassSweep so the
  // CSS keyframe replays on every switch, even when the same
  // platform is re-selected via keyboard.
  const [glassNonce, setGlassNonce] = useState(0);
  // Skip running the sweep on the very first mount — the visitor
  // hasn't *chosen* anything yet; we don't want a spurious flash
  // as soon as the section scrolls into view.
  const isInitial = useRef(true);
  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    setGlassNonce((n) => n + 1);
  }, [current]);

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const handleSelect = useCallback(
    (p: Platform) => {
      if (p !== current) onSelect(p);
    },
    [current, onSelect]
  );

  // Tab keyboard nav: arrow keys cycle through the trio with wrap.
  const handleTabsKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const key = e.key;
      if (
        key !== 'ArrowLeft' &&
        key !== 'ArrowRight' &&
        key !== 'ArrowUp' &&
        key !== 'ArrowDown'
      ) {
        return;
      }
      e.preventDefault();
      const dir = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
      const next = (activeIdx + dir + OPTIONS.length) % OPTIONS.length;
      onSelect(OPTIONS[next].value);
      tabRefs.current[next]?.focus();
    },
    [activeIdx, onSelect]
  );

  return (
    <section
      id={PLATFORM_PICKER_ANCHOR_ID}
      className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
      aria-labelledby="platform-title"
    >
      {/* ---- Editorial heading -------------------------------------- */}
      <div className="mb-8 text-center sm:mb-10">
        <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--fg-4)]">
          <span className="h-px w-6 bg-[var(--border-2)]" />
          {t('platform.eyebrow')}
          <span className="h-px w-6 bg-[var(--border-2)]" />
        </p>
        <h2
          id="platform-title"
          className="text-2xl font-semibold tracking-tight text-[var(--fg-1)] sm:text-3xl"
        >
          {t('platform.title')}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--fg-3)]">
          {t('platform.subtitle')}
        </p>
      </div>

      {/* ---- Tab row ------------------------------------------------ */}
      <div
        role="tablist"
        aria-label={t('platform.title')}
        onKeyDown={handleTabsKeyDown}
        className="mx-auto mb-6 flex w-fit items-center gap-1 rounded-full border border-[var(--border-1)] bg-[var(--surface-1)] p-1 sm:gap-1.5"
      >
        {OPTIONS.map((opt, i) => {
          const active = opt.value === current;
          return (
            <button
              key={opt.value}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => handleSelect(opt.value)}
              className={
                'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 sm:px-4 sm:py-2 sm:text-sm ' +
                (active
                  ? 'bg-[var(--surface-3)] text-[var(--fg-1)] shadow-[inset_0_1px_0_rgb(255_255_255/0.05),0_1px_3px_rgb(0_0_0/0.15)]'
                  : 'text-[var(--fg-3)] hover:text-[var(--fg-1)]')
              }
            >
              <opt.Icon className="h-3.5 w-3.5" />
              <span>{t(opt.compactTitleKey)}</span>
            </button>
          );
        })}
      </div>

      {/* ---- Stage: three device shells stacked on top of each other --- */}
      <div className="relative mx-auto max-w-4xl">
        {/* The stage carries its own aspect ratio so the absolutely-
            positioned shell cards have a fixed canvas to lay out
            against on every breakpoint. 5:3 matches the legacy
            device-mockup viewBox, keeping the deck proportional and
            readable down to ~480px wide. */}
        <div
          className="relative aspect-[5/3] w-full"
          style={{ perspective: '1400px' }}
        >
          {OPTIONS.map((opt, i) => {
            const active = opt.value === current;
            const slot = getSlot(i, activeIdx);

            return (
              <button
                key={opt.value}
                type="button"
                role="tabpanel"
                aria-label={t(opt.titleKey)}
                aria-hidden={!active}
                tabIndex={-1}
                onClick={() => handleSelect(opt.value)}
                className={
                  'eikon-stack-card absolute inset-0 rounded-2xl text-left outline-none ' +
                  'focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)]'
                }
                style={{
                  transform: getCardTransform(slot, opt.value, current),
                  zIndex:
                    slot === 'center' ? 30 : slot === 'right' ? 20 : 10,
                  pointerEvents: 'none',
                }}
              >
                <ScaledDeviceShell
                  slot={slot}
                  platform={opt.value}
                  active={active}
                  glassNonce={glassNonce}
                  title={t(opt.titleKey)}
                >
                  <ScreenContent
                    eyebrow={t(opt.compactTitleKey)}
                    title={t(opt.titleKey)}
                    desc={t(opt.descKey)}
                    bullets={opt.bulletKeys.map((k) => t(k))}
                    ctaLabel={t('outputs.tryNow')}
                    density={opt.density}
                  />
                </ScaledDeviceShell>
              </button>
            );
          })}
        </div>

        {/* ---- Keyboard hint -------------------------------------- */}
        <p className="mt-6 hidden text-center text-[11px] text-[var(--fg-4)] [@media(hover:hover)]:block">
          <kbd className="rounded border border-[var(--border-1)] bg-[var(--surface-1)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--fg-3)]">
            ←
          </kbd>{' '}
          <kbd className="rounded border border-[var(--border-1)] bg-[var(--surface-1)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--fg-3)]">
            →
          </kbd>{' '}
          {t('platform.keyboardHint')}
        </p>
      </div>

      {/* Locale tap helper — small but ensures the i18n hook re-runs in
        SSR-style snapshots that re-mount on language change. Inert. */}
      <span className="sr-only" aria-hidden="true" data-lang={lang} />
    </section>
  );
}

// =============================================================================
// Card transform / slotting helpers
// =============================================================================

type StackSlot = 'left' | 'center' | 'right';

/**
 * Map an option index to one of the three visible slots given the
 * currently-active option index. We always want exactly one card in
 * the centre and the other two fanned to the sides — the side
 * assignment is stable as the active selection moves (clockwise:
 * the card immediately after the active one goes to the right, the
 * one before it goes to the left).
 */
function getSlot(idx: number, activeIdx: number): StackSlot {
  if (idx === activeIdx) return 'center';
  const n = OPTIONS.length;
  // Clockwise distance from active to idx, modulo n. With n=3:
  //   diff === 1  → the card "next" in the cycle → right slot
  //   diff === 2  → the card "previous" in the cycle → left slot
  const diff = (idx - activeIdx + n) % n;
  return diff === 1 ? 'right' : 'left';
}

/** Side-card size reduction — applied ONCE inside `ScaledDeviceShell`
 *  (single `scale()`), NOT on `.eikon-stack-card`. Stacking
 *  `scale(0.78)` on the button AND another `scale()` on the device
 *  rasterises thin bezels twice and produces the jagged "rough"
 *  edges + screen-border gaps the visitor sees on left/right cards. */
const STACK_SLOT_SCALE: Record<StackSlot, number> = {
  center: 1,
  left: 0.82,
  right: 0.82,
};

function getCardTransform(slot: StackSlot, platform: DevicePlatform, centerPlatform: DevicePlatform): string {
  if (slot === 'center') {
    return 'translate3d(0,0,0) rotate(0deg)';
  }
  const rot = platform === 'mobile' ? 8 : 4;
  // When the center device is wide, push side cards further out
  let tx = 28;
  if (centerPlatform === 'desktop') tx = 34;
  else if (centerPlatform === 'web' && platform === 'mobile') tx = 32;
  if (slot === 'left') {
    return `translate3d(-${tx}%, 5%, 0) rotate(-${rot}deg)`;
  }
  return `translate3d(${tx}%, 5%, 0) rotate(${rot}deg)`;
}

// =============================================================================
// ScaledDeviceShell — wraps the playground's pixel-accurate `DeviceShell`
// (titanium iPhone / macOS Sequoia window / Chrome browser) so that
// each card can render the SAME fidelity chrome the playground uses,
// auto-scaled to fit the stacked-card stage.
//
// The playground's `DeviceShell` is sized in real device pixels
// (e.g. mobile = 375×667, desktop = 1024×640). For the landing page
// we want all three shells to live INSIDE a 5:3 stage that responds
// to viewport width, so we measure the wrapper with a `ResizeObserver`
// and apply a CSS `transform: scale()` that keeps the natural-sized
// device just-fitting inside the stage with a touch of breathing room.
//
// On top of the playground's SOFTWARE chrome (the browser window, the
// macOS title bar) the landing page also paints a HARDWARE shell:
//
//   - `web`     → wrapped in `LaptopHardwareShell` (MacBook lid +
//                  notch + keyboard deck + trackpad)
//   - `desktop` → wrapped in `IMacHardwareShell` (silver bezel +
//                  chin with Apple logo + neck + base)
//   - `mobile`  → no extra wrap (DeviceShell already paints a
//                  titanium iPhone — that IS the hardware)
//
// The playground's PreviewFrame never touches these wrappers; it
// keeps using `DeviceShell` directly because the preview area is
// already framed by the playground's own panel chrome.
//
// We also paint the `ActiveAmbience` warm halo + the one-shot
// `eikon-glass-sweep` overlay on the active card — both live INSIDE
// the scaled wrapper so they stay visually anchored to the device as
// the screen resizes.
// =============================================================================

function ScaledDeviceShell({
  slot,
  platform,
  active,
  glassNonce,
  title,
  children,
}: {
  slot: StackSlot;
  platform: DevicePlatform;
  active: boolean;
  glassNonce: number;
  title: string;
  children: ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  // Measure the wrapper (stage cell) and the natural-size device
  // (DeviceShell + optional hardware wrap), then compute the largest
  // scale that lets the device fit with a small (~8%) margin. Re-runs
  // on viewport resize via ResizeObserver.
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;
    const recalc = () => {
      const wr = wrapper.getBoundingClientRect();
      // `offsetWidth/Height` give the UNSCALED natural size — the
      // CSS `transform: scale(...)` applied to `inner` doesn't
      // affect its layout box, so these stay stable.
      const natW = inner.offsetWidth;
      const natH = inner.offsetHeight;
      if (!natW || !natH || !wr.width || !wr.height) return;
      const sx = (wr.width * 0.92) / natW;
      const sy = (wr.height * 0.92) / natH;
      setScale(Math.min(sx, sy));
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [platform]);

  const layoutScale = scale * STACK_SLOT_SCALE[slot];

  // Render-prop bridge between the DeviceShell's `(screenStyle) => ReactNode`
  // contract and our editorial `children`. All three platforms always
  // show the white powered-on screen + copy underneath; brightness is
  // controlled by a scrim overlay, not by hiding content or painting
  // the panel black.
  //
  //   - resting (inactive OR active before any switch) → static
  //     `SCREEN_DIM_SCRIM` on top of the live UI.
  //   - active, after a switch (`glassNonce > 0`) → `eikon-screen-wake`
  //     animates that same scrim from dim → transparent (see
  //     `softwareShell`).
  //
  // Wake + glass sweep live one level up (wrapping DeviceShell) so
  // they can cover browser/desktop chrome as well as the screen rect.
  const renderScreen = (screenStyle: CSSProperties) => (
    <div
      style={{
        ...screenStyle,
        position: 'relative',
        overflow: 'hidden',
        background: screenStyle.background,
      }}
    >
      {children}
    </div>
  );

  // softwareShell wraps the DeviceShell in a `position: relative`
  // box so we can stack the wake-overlay + glass-sweep on top of
  // the chrome itself, not just on top of the inner screen.
  //
  // Per-platform geometry — the overlays each carry their OWN inset
  // and borderRadius so we never clip the wrapper itself (which
  // would also clip the device's titanium chassis on mobile).
  //
  //   - web      → covers the entire macOS window (tab strip + URL
  //                bar + screen). Window radius is 12.
  //   - desktop  → covers the entire macOS window (title bar +
  //                screen). Window radius is 12.
  //   - mobile   → covers ONLY the screen INSIDE the titanium
  //                frame. The frame itself (the silver chamfered
  //                bezel + side buttons + crown highlights) must
  //                stay visible during the wake animation — it's
  //                physical hardware, not part of the lit panel.
  //                Inset 10px (PHONE_GEOMETRY.small.bezel) keeps
  //                the overlay flush with the screen edge, and
  //                radius 32 (cornerRadius 42 - bezel 10) traces
  //                the screen's inner curve.
  //
  // The previous version of this function gave the WRAPPER a
  // matching borderRadius + overflow:hidden, which worked for
  // desktop/web but on mobile painted the wake overlay over the
  // titanium chassis itself — the iPhone visually lost its frame
  // during every switch. Per-overlay geometry sidesteps the
  // wrapper-clip approach entirely.
  const overlayStyle: CSSProperties =
    platform === 'mobile'
      ? { inset: 10, borderRadius: 32 }
      : { inset: 0, borderRadius: 12 };

  const softwareShell = (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <DeviceShell
        platform={platform}
        size="small"
        title={title}
        domain="eikon-devkit.preview"
      >
        {renderScreen}
      </DeviceShell>
      {(!active || glassNonce === 0) && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute z-[3]"
          style={{
            ...overlayStyle,
            backgroundColor: !active
              ? SCREEN_DIM_SCRIM_INACTIVE
              : SCREEN_DIM_SCRIM,
          }}
        />
      )}
      {active && glassNonce > 0 && (
          <span
            key={`wake-${glassNonce}`}
            aria-hidden="true"
            className="eikon-screen-wake"
            style={overlayStyle}
          />
      )}
    </div>
  );

  // `mobile` already IS hardware (DeviceShell paints a titanium iPhone).
  // For `web` and `desktop` we wrap the software chrome in the matching
  // Apple hardware silhouette.
  let body: ReactNode;
  if (platform === 'web') {
    body = <LaptopHardwareShell>{softwareShell}</LaptopHardwareShell>;
  } else if (platform === 'desktop') {
    body = <IMacHardwareShell>{softwareShell}</IMacHardwareShell>;
  } else {
    body = softwareShell;
  }

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 flex items-center justify-center"
    >
      <div
        ref={innerRef}
        className="relative"
        style={{
          transform: `scale(${layoutScale})`,
          transformOrigin: 'center center',
          transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          filter: 'blur(0px)',
          pointerEvents: 'auto',
          cursor: 'pointer',
        }}
      >
        {/* Warm tungsten ambience — sits BEHIND the device, tracking
            its bounds (extends slightly outside via negative inset
            for a soft halo). Scales with the device so the falloff
            looks consistent across breakpoints. */}
        <ActiveAmbience active={active} platform={platform} />

        {/* Device shell + screen content. `position: relative` +
            `z-10` keeps the device on top of the ambience layer
            inside this stacking context. */}
        <div className="relative z-10">{body}</div>
      </div>
    </div>
  );
}

// =============================================================================
// LaptopHardwareShell — MacBook silhouette around the Chrome browser
//
// Painted as three stacked pieces in a single flex column so the deck
// is automatically the same width as the lid (lid width is driven by
// the inner `DeviceShell`, which is fixed at 1024 CSS px for the
// `web` size preset).
//
//                 ┌──────┐ notch
//   ┌────────────╫══════╫────────────┐
//   │          ▌  camera  ▌          │  ← lid: dark titanium bezel
//   │   ┌──────────────────────┐     │     padding=14 around the
//   │   │   <DeviceShell web>  │     │     Chrome browser chrome
//   │   └──────────────────────┘     │
//   └────────────────────────────────┘
//   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ← thin hinge gap (the seam
//   ╔════════════════════════════════╗     between lid + base)
//   ║   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒   ║  ← deck: brushed grey, slight
//   ║   ▒  keyboard well (4 rows) ▒  ║     edge highlight on top
//   ║   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒   ║
//   ║          ┌─────────────┐       ║  ← trackpad (centred)
//   ║          └─────────────┘       ║
//   ╚════════════════════════════════╝
//
// The deck extends ~28 CSS px PAST the lid on each side via negative
// horizontal margins — real MacBooks have a deck slightly wider than
// the closed lid because the unibody base wraps around the screen
// when the lid is shut. That overhang reads as "this is a laptop,
// not a tablet on a stand" at a glance.
// =============================================================================

const LAPTOP_TOKENS = {
  // === Lid (the screen-side titanium piece) ===
  // Three-stop vertical gradient. Mid-tone is deep enough to read
  // as Space Black, but the top stop is light enough that the
  // chamfered bevel highlight (inset 0 0 0 0.5px on the outer box)
  // catches it and reads as a proper machined edge — without that
  // contrast the lid silhouette dissolved into the hero background.
  lidTop: '#2a2d33',
  lidMid: '#1c1e22',
  lidBottom: '#121418',

  // === Hinge — thin near-black recess between lid and deck ===
  // Deeper than before to sell the "two unibody pieces with a gap"
  // story when the laptop is open.
  hingeTop: '#0a0c10',
  hingeMid: '#040506',

  // === Deck (the base, where the keyboard lives) ===
  // Five-stop vertical gradient that simulates brushed aluminium:
  //
  //   topRim    — the strip right behind the keyboard well, slightly
  //               darker than the centre because the hinge casts a
  //               soft shadow there
  //   midUpper  — start of the bright reflection band
  //   mid       — peak of the brushed-aluminium sheen, where room
  //               light would bounce most strongly; this is the
  //               *lightest* point on the whole deck
  //   midLower  — falling back down toward the front edge
  //   bottom    — front edge in shadow, sells unibody thickness
  //
  // The whole thing is meaningfully brighter than the previous
  // `deckMid: #4b4e55` ceiling so the keys (now pure-black) read
  // with strong contrast and the deck stops feeling like rubber.
  deckTopRim: '#2a2c30',
  deckMidUpper: '#43464d',
  deckMid: '#585b62',
  deckMidLower: '#3e4047',
  deckBottom: '#1c1e22',

  // === Keyboard well — recessed cavity the keys sit in ===
  // Pushed to near-black to maximise the recess feeling. Inset
  // shadows on the well itself handle the "carved into the deck"
  // illusion; the well's gradient is mostly there to keep the
  // shadow gradient from clipping on the top edge.
  keyWellTop: '#0d0f13',
  keyWellBottom: '#06080a',

  // === Key cap ===
  // Pure-black key tops (vs the previous mid-grey #2a2d33) so each
  // individual key reads as a distinct dark object against the now
  // lighter deck. A thin top inset highlight + bottom inset shadow
  // (added inline in the JSX) sells the key's chamfered cap.
  keyTop: '#171920',
  keyBottom: '#0a0b0e',

  // === Trackpad — single piece of glass set into the deck ===
  // Three-stop vertical gradient: a brighter top edge where the
  // glass catches room light (top inset highlight pushes this
  // further), a deep mid tone, and a slightly lifted bottom so the
  // pad reads as glass-on-metal rather than a hole punched in the
  // deck. The top is *brighter* than the deck mid (was darker
  // before, which is what made it look "sunken").
  trackpadTop: '#5e6168',
  trackpadMid: '#3a3d44',
  trackpadBottom: '#26282d',
} as const;

function LaptopHardwareShell({ children }: { children: ReactNode }) {
  const lidPadding = 14;
  const notchWidth = 110;
  const notchHeight = 12;
  const deckHeight = 220;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* ---- Lid: titanium bezel + notch + camera + inner screen ---- */}
      <div
        style={{
          position: 'relative',
          padding: lidPadding,
          paddingBottom: lidPadding - 2,
          background: `linear-gradient(180deg, ${LAPTOP_TOKENS.lidTop} 0%, ${LAPTOP_TOKENS.lidMid} 45%, ${LAPTOP_TOKENS.lidBottom} 100%)`,
          borderRadius: '16px 16px 0 0',
          boxShadow: [
            'inset 0 0 0 1px rgba(255,255,255,0.08)',
            'inset 0 1px 0 rgba(255,255,255,0.08)',
            '0 36px 60px -28px rgba(0,0,0,0.7)',
          ].join(', '),
        }}
      >
        {/* Notch — small recessed black tab hanging off the top of
            the lid. Top corners flat (it's flush with the lid edge),
            bottom corners rounded so it reads as a cut-out. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: notchWidth,
            height: notchHeight,
            background: '#000',
            borderRadius: '0 0 6px 6px',
            zIndex: 5,
            boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.05)',
          }}
        />
        {/* FaceTime camera dot inside the notch. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: notchHeight / 2 - 1.5,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: '#1a1a1f',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)',
            zIndex: 6,
          }}
        />
        {/* Inner screen — children is the DeviceShell. We clip to a
            small radius so the corners of the Chrome chrome don't
            poke past the bezel. */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 4,
            background: '#000',
          }}
        >
          {children}
        </div>
      </div>

      {/* ---- Hinge gap: thin near-black strip between lid and deck. ---- */}
      <div
        aria-hidden="true"
        style={{
          height: 3,
          background: `linear-gradient(180deg, ${LAPTOP_TOKENS.hingeTop} 0%, ${LAPTOP_TOKENS.hingeMid} 50%, ${LAPTOP_TOKENS.hingeTop} 100%)`,
        }}
      />

      {/* ---- Deck: keyboard well + trackpad ----
          Negative side margins extend it past the lid for the
          "unibody wraps around the closed screen" look. The deck is
          painted in three stacked layers so the brushed-aluminium
          illusion holds:
            1. base gradient (5-stop vertical, in LAPTOP_TOKENS)
            2. sheen     — a wide oval radial highlight at the top,
                           simulating room light catching the metal
            3. grain     — repeating 1px horizontal stripes at very
                           low alpha, simulating anodised brushed
                           aluminium texture
          Sheen and grain are absolutely positioned siblings rendered
          BEFORE the keyboard/trackpad in DOM order, so the deck
          contents (grille, keys, trackpad — all `position: relative`)
          paint on top of them by virtue of CSS z-auto stack order. */}
      <div
        style={{
          position: 'relative',
          height: deckHeight,
          background: `linear-gradient(180deg, ${LAPTOP_TOKENS.deckTopRim} 0%, ${LAPTOP_TOKENS.deckMidUpper} 10%, ${LAPTOP_TOKENS.deckMid} 52%, ${LAPTOP_TOKENS.deckMidLower} 86%, ${LAPTOP_TOKENS.deckBottom} 100%)`,
          borderRadius: '0 0 18px 18px',
          paddingTop: 22,
          paddingInline: 60,
          boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.16)',
            'inset 0 -1.5px 0 rgba(0,0,0,0.5)',
            '0 22px 44px -22px rgba(0,0,0,0.65)',
          ].join(', '),
          overflow: 'hidden',
        }}
      >
        {/* Sheen — wide elliptical highlight from the top centre,
            mimicking diffuse room light reflecting off the deck. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '75%',
            background:
              'radial-gradient(ellipse 65% 90% at 50% 0%, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.04) 35%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        {/* Brushed-aluminium grain — 1px horizontal stripes at very
            low alpha. Reads as fine micro-texture in peripheral
            vision and disappears at distance; never as a "pattern". */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'repeating-linear-gradient(0deg, transparent 0 1px, rgba(255,255,255,0.022) 1px 2px)',
            opacity: 0.6,
            pointerEvents: 'none',
          }}
        />

        {/* Top speaker grille — tiny dot strip running along the top
            of the deck, simulating the perforated metal on real
            MacBooks. We stop short of the deck edges so it reads as
            a discrete grille band rather than a divider. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 12,
            left: 80,
            right: 80,
            height: 4,
            background:
              'repeating-linear-gradient(90deg, rgba(0,0,0,0.5) 0 1.5px, transparent 1.5px 4px)',
            opacity: 0.6,
          }}
        />

        {/* Function-row strip — a single thin near-black band sitting
            just above the keyboard well, recessed slightly. Mimics
            the top row of half-height function keys on real MacBook
            keyboards without forcing us to draw 14 micro-rectangles. */}
        <div
          aria-hidden="true"
          style={{
            position: 'relative',
            marginTop: 12,
            height: 8,
            background: `linear-gradient(180deg, ${LAPTOP_TOKENS.keyWellTop} 0%, ${LAPTOP_TOKENS.keyWellBottom} 100%)`,
            borderRadius: '4px 4px 1px 1px',
            boxShadow:
              'inset 0 1px 0 rgba(0,0,0,0.55), inset 0 -1px 0 rgba(255,255,255,0.03)',
          }}
        />

        {/* Keyboard well — recessed dark cavity holding the keys. */}
        <div
          aria-hidden="true"
          style={{
            position: 'relative',
            marginTop: 1,
            height: 92,
            background: `linear-gradient(180deg, ${LAPTOP_TOKENS.keyWellTop} 0%, ${LAPTOP_TOKENS.keyWellBottom} 100%)`,
            borderRadius: '1px 1px 6px 6px',
            boxShadow: [
              'inset 0 1px 0 rgba(0,0,0,0.55)',
              'inset 0 -1px 0 rgba(255,255,255,0.04)',
            ].join(', '),
            padding: 7,
            display: 'grid',
            gridTemplateRows: 'repeat(4, 1fr)',
            gap: 4,
          }}
        >
          {[14, 14, 13, 9].map((cols, row) => (
            <div
              key={row}
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap: 3,
                ...(row === 3
                  ? { paddingInline: '14%' /* space-bar row is shorter */ }
                  : null),
              }}
            >
              {Array.from({ length: cols }).map((_, col) => (
                <div
                  key={col}
                  style={{
                    background: `linear-gradient(180deg, ${LAPTOP_TOKENS.keyTop} 0%, ${LAPTOP_TOKENS.keyBottom} 100%)`,
                    borderRadius: 2,
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.5)',
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Trackpad — single piece of glass set into the deck.
            Three-layer paint job:
              1. base gradient (top brighter than mid brighter than
                 bottom — top catches room light, bottom in shadow)
              2. glass reflection — soft top-down white wash, sells
                 the "this is glass, not metal" cue
              3. inset highlights/shadows — bevelled edge between
                 glass and the surrounding aluminium */}
        <div
          aria-hidden="true"
          style={{
            position: 'relative',
            margin: '14px auto 0',
            width: '50%',
            height: 60,
            background: `linear-gradient(180deg, ${LAPTOP_TOKENS.trackpadTop} 0%, ${LAPTOP_TOKENS.trackpadMid} 50%, ${LAPTOP_TOKENS.trackpadBottom} 100%)`,
            borderRadius: 9,
            boxShadow: [
              'inset 0 1px 0 rgba(255,255,255,0.22)',
              'inset 0 -1px 0 rgba(0,0,0,0.45)',
              'inset 0 0 0 1px rgba(0,0,0,0.4)',
              '0 1px 1px rgba(0,0,0,0.3)',
            ].join(', '),
          }}
        >
          {/* Glass reflection — soft top-down white wash overlaid on
              the trackpad's gradient. The wash fades to transparent
              at ~40% height so the lower part of the pad keeps the
              deep glass tone. */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 30%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// IMacHardwareShell — iMac / Studio Display silhouette around the
// macOS Sequoia window.
//
//   ┌──────────────────────────────────────┐
//   │   ┌──────────────────────────────┐   │  ← bezel: pale silver
//   │   │  <DeviceShell desktop>       │   │     edge, ~14px around
//   │   └──────────────────────────────┘   │     the macOS chrome
//   ├──────────────────────────────────────┤  ← chin: lighter strip,
//   │                  ️                   │     centred Apple logo
//   └──────────────────────────────────────┘
//                  ▏       ▕
//                  ▏       ▕                   ← neck: thin trapezoid
//             ╔══════════════╗
//             ╚══════════════╝                 ← base: rounded pill
//
// Silver finish (vs the laptop's dark titanium) so the two devices
// read as distinct hardware classes even when stacked behind each
// other at scale.
// =============================================================================

const IMAC_TOKENS = {
  bezelTop: '#dfe0e3',
  bezelMid: '#cdced1',
  bezelBottom: '#b8babd',
  chinTop: '#cdced1',
  chinBottom: '#b1b3b7',
  neckTop: '#c3c5c8',
  neckBottom: '#a4a6aa',
  baseTop: '#bcbec2',
  baseBottom: '#94969a',
  appleLogo: 'rgba(0,0,0,0.32)',
} as const;

function IMacHardwareShell({ children }: { children: ReactNode }) {
  const bezelPadding = 14;
  const chinHeight = 60;
  const neckHeight = 32;
  const baseHeight = 16;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* ---- Bezel + chin (single bounding box; chin lives at the
          bottom and is flush with the bezel sides so the two pieces
          read as a unibody). ---- */}
      <div
        style={{
          position: 'relative',
          padding: bezelPadding,
          paddingBottom: bezelPadding + chinHeight,
          background: `linear-gradient(180deg, ${IMAC_TOKENS.bezelTop} 0%, ${IMAC_TOKENS.bezelMid} 45%, ${IMAC_TOKENS.bezelBottom} 100%)`,
          borderRadius: 18,
          boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.85)',
            'inset 0 -1px 0 rgba(0,0,0,0.18)',
            'inset 0 0 0 1px rgba(0,0,0,0.08)',
            '0 30px 60px -28px rgba(0,0,0,0.45)',
          ].join(', '),
        }}
      >
        {/* Inner screen — children is the DeviceShell. */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 6,
            background: '#000',
          }}
        >
          {children}
        </div>
        {/* Chin — lighter strip at the bottom, centred Apple logo.
            Pinned to the outer bezel via absolute so the logo sits
            on the chin surface rather than floating in the padding. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: chinHeight,
            background: `linear-gradient(180deg, ${IMAC_TOKENS.chinTop} 0%, ${IMAC_TOKENS.chinBottom} 100%)`,
            borderRadius: '0 0 18px 18px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppleLogo
            style={{ width: 18, height: 22, color: IMAC_TOKENS.appleLogo }}
          />
        </div>
      </div>

      {/* ---- Neck: short trapezoid hanging off the chin centre. ---- */}
      <div
        aria-hidden="true"
        style={{
          margin: '0 auto',
          width: '22%',
          height: neckHeight,
          background: `linear-gradient(180deg, ${IMAC_TOKENS.neckTop} 0%, ${IMAC_TOKENS.neckBottom} 100%)`,
          clipPath: 'polygon(18% 0, 82% 0, 100% 100%, 0 100%)',
        }}
      />

      {/* ---- Base: wide rounded pill, casts a faint shadow on the
          stage so the iMac reads as standing on a desk. ---- */}
      <div
        aria-hidden="true"
        style={{
          margin: '0 auto',
          width: '52%',
          height: baseHeight,
          background: `linear-gradient(180deg, ${IMAC_TOKENS.baseTop} 0%, ${IMAC_TOKENS.baseBottom} 100%)`,
          borderRadius: '6px 6px 50% 50% / 6px 6px 100% 100%',
          boxShadow: '0 12px 22px -10px rgba(0,0,0,0.45)',
        }}
      />
    </div>
  );
}

function AppleLogo({ style }: { style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 814 1000"
      style={style}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M790.5 654c-19.6 56.7-45.1 113.3-86.7 162.4-32.6 38.4-72.1 86.2-122.7 86.5-44.6.2-58-29-118.5-29-60.4 0-77.2 28.7-119.6 29.5-49 .9-87.4-41.7-119.9-79.5C151.6 738.2 100 597.6 137 482c20.8-65.6 75.9-117.3 144.5-127.8 51.4-7.9 99 24.3 130 24.3 30.9 0 88.8-30.1 149.7-25.7 25.5 1.1 97 10.3 142.9 77.6-3.7 2.3-85.4 49.9-84.5 148.9 1 118.4 103.6 157.8 104.9 158.4-1 3.2-16.5 56.3-54 113.3zM497.5 198.4c27.9-32.7 46.4-78.4 41.4-123.7-39.6 1.6-89 26.1-117.5 58.8-25.5 28.9-47.9 75.4-41.9 119.7 43.9 3.4 88.9-22.3 118-54.8z" />
    </svg>
  );
}

// =============================================================================
// Active ambience — screen-shaped warm glow behind the active card
//
// Two blurred rectangles matching the real screen area within each
// device (laptop lid, iMac panel, phone glass). The blur radius
// makes light appear to radiate outward from the panel edges — the
// same way a real lit screen bounces warm light onto the wall behind
// it. Per-platform inset/offset values account for non-screen parts
// (keyboard deck, iMac stand, phone bezel) so the glow tracks the
// actual emitting surface rather than the full device bounding box.
//
// Both layers carry `.eikon-screen-glow` so they share the 500 ms
// "power-on" overshoot keyframe used elsewhere on the page.
// =============================================================================

/** Per-platform screen-glow geometry. The glow shape tracks the real
 *  screen rectangle within each device so light appears to radiate
 *  outward from the lit panel rather than from a generic circle. */
const AMBIENCE_SCREEN: Record<DevicePlatform, {
  far: CSSProperties;
  close: CSSProperties;
  spill: CSSProperties;
}> = {
  web: {
    far: { top: '-8%', bottom: '10%', left: '-14%', right: '-14%', borderRadius: 32 },
    close: { top: '2%', bottom: '20%', left: '-2%', right: '-2%', borderRadius: 18 },
    spill: { top: '62%', bottom: '-8%', left: '8%', right: '8%', borderRadius: 12 },
  },
  desktop: {
    far: { top: '-8%', bottom: '14%', left: '-14%', right: '-14%', borderRadius: 32 },
    close: { top: '2%', bottom: '24%', left: '-2%', right: '-2%', borderRadius: 18 },
    spill: { top: '58%', bottom: '-6%', left: '12%', right: '12%', borderRadius: 12 },
  },
  mobile: {
    far: { top: '-4%', bottom: '-10%', left: '-24%', right: '-24%', borderRadius: 36 },
    close: { top: '2%', bottom: '-2%', left: '-8%', right: '-8%', borderRadius: 24 },
    spill: { top: '8%', bottom: '-6%', left: '-14%', right: '-14%', borderRadius: 28 },
  },
};

function ActiveAmbience({ active, platform }: { active: boolean; platform: DevicePlatform }) {
  if (!active) return null;
  const cfg = AMBIENCE_SCREEN[platform];
  return (
    <>
      {/* Far glow — large soft wash radiating from the screen shape. */}
      <span
        aria-hidden="true"
        className="eikon-screen-glow pointer-events-none absolute"
        style={{
          ...cfg.far,
          background:
            'radial-gradient(ellipse 80% 70% at 50% 55%, rgba(252,211,77,0.20) 0%, rgba(253,230,138,0.08) 40%, transparent 80%)',
          filter: 'blur(60px)',
        }}
      />
      {/* Close halo — tighter glow at the screen edges. */}
      <span
        aria-hidden="true"
        className="eikon-screen-glow pointer-events-none absolute"
        style={{
          ...cfg.close,
          background:
            'radial-gradient(ellipse 90% 80% at 50% 55%, rgba(253,230,138,0.14) 0%, rgba(253,230,138,0.04) 55%, transparent 80%)',
          filter: 'blur(20px)',
        }}
      />
      {/* Spill — faint warm wash on device body surfaces. */}
      <span
        aria-hidden="true"
        className="eikon-screen-glow pointer-events-none absolute"
        style={{
          ...cfg.spill,
          background:
            'radial-gradient(ellipse 100% 80% at 50% 0%, rgba(253,230,138,0.09) 0%, transparent 70%)',
          filter: 'blur(14px)',
        }}
      />
    </>
  );
}

// =============================================================================
// In-screen editorial content
// =============================================================================

/**
 * The text payload rendered INSIDE the device's screen. The playground's
 * `DeviceShell` paints the screen background WHITE (mirroring the real
 * macOS / Chrome / iOS chrome) and passes us the screen-style as the
 * render-prop argument — including the `paddingTop: 44 / paddingBottom: 28`
 * the MobileShell needs to keep its faux status bar and home indicator
 * clear of content. We render dark Apple-system-style typography on
 * that white surface so the trio reads as "real OS UI" rather than the
 * dark-themed mockups it replaces.
 *
 * Two layout flavours selected via `density`:
 *
 *   - `wide`   → browser / desktop. Full title, description, and three
 *                bullets at viewport-friendly font sizes.
 *   - `narrow` → phone. Description collapses; bullets shrink so the
 *                whole stack still reads at the ~30%-of-stage screen
 *                width the phone bezel allows.
 */
function ScreenContent({
  eyebrow,
  title,
  desc,
  bullets,
  ctaLabel,
  density,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  bullets: ReadonlyArray<string>;
  ctaLabel: string;
  density: 'wide' | 'narrow';
}) {
  const isWide = density === 'wide';
  const appleFont: CSSProperties['fontFamily'] =
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif';
  return (
    <div
      className={
        'relative flex h-full w-full flex-col overflow-hidden text-left ' +
        (isWide ? 'gap-2 px-6 py-5 sm:px-8 sm:py-6' : 'gap-1.5 px-3 py-3')
      }
      style={{
        fontFamily: appleFont,
        background:
          'radial-gradient(140% 90% at 50% -10%, rgba(252,211,77,0.10) 0%, transparent 55%)',
      }}
    >
      <p
        className={
          'font-medium uppercase tracking-[0.22em] ' +
          (isWide ? 'text-[10px] sm:text-[11px]' : 'text-[8px]')
        }
        style={{ color: '#86868b' }}
      >
        {eyebrow}
      </p>
      <h3
        className={
          'font-semibold leading-tight ' +
          (isWide ? 'text-lg sm:text-xl md:text-2xl' : 'text-[11px]')
        }
        style={{ color: '#1d1d1f', letterSpacing: '-0.01em' }}
      >
        {title}
      </h3>
      <p
        className={
          'leading-relaxed ' +
          (isWide
            ? 'text-xs sm:text-sm md:text-[15px]'
            : 'text-[9px] line-clamp-3')
        }
        style={{ color: '#515154' }}
      >
        {desc}
      </p>

      <ul
        className={
          'mt-1 flex flex-col ' +
          (isWide ? 'gap-1.5 text-xs sm:gap-2 sm:text-sm' : 'gap-1 text-[9px]')
        }
        style={{ color: '#1d1d1f' }}
      >
        {bullets.map((b) => (
          <li
            key={b}
            className={'flex items-start ' + (isWide ? 'gap-2' : 'gap-1')}
          >
            <CheckIcon
              className={
                'shrink-0 ' +
                (isWide ? 'mt-0.5 h-3.5 w-3.5' : 'mt-[2px] h-2.5 w-2.5')
              }
              style={{ color: '#f59e0b' }}
            />
            <span className="leading-snug">{b}</span>
          </li>
        ))}
      </ul>

      <span
        className={
          'mt-auto inline-flex w-fit items-center rounded-md font-medium ' +
          (isWide
            ? 'gap-1.5 px-3 py-1.5 text-xs'
            : 'gap-1 px-1.5 py-0.5 text-[9px]')
        }
        style={{
          background: 'rgba(252,211,77,0.14)',
          color: '#92400e',
          border: '1px solid rgba(252,211,77,0.5)',
        }}
      >
        {ctaLabel}
      </span>
    </div>
  );
}

// =============================================================================
// Compact row (sidebar variant)
// =============================================================================

/**
 * Slim selectable row used by the `compact` layout. Single row of
 * icon + title + description; active state lifts the foreground and
 * shows a brand-coloured dot on the right.
 *
 * The whole row is the click target. We keep the border on every
 * state so the sidebar doesn't visually re-flow when the selection
 * moves (otherwise the active row's extra border width would shift
 * its siblings by 1px each toggle).
 */
function CompactPlatformRow({
  active,
  title,
  desc,
  Icon,
  onSelect,
}: {
  active: boolean;
  title: string;
  desc: string;
  Icon: (props: { className: string }) => ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={
        'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ' +
        (active
          ? 'border-brand-500/45 bg-brand-500/10'
          : 'border-[var(--border-1)] bg-[var(--surface-1)] hover:border-[var(--border-2)] hover:bg-[var(--surface-2)]')
      }
    >
      <span
        className={
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ' +
          (active
            ? 'border-brand-500/40 bg-brand-500/15 text-brand-400'
            : 'border-[var(--border-1)] bg-[var(--surface-2)] text-[var(--fg-2)]')
        }
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className={
            'text-sm font-medium ' +
            (active ? 'text-[var(--fg-1)]' : 'text-[var(--fg-2)]')
          }
        >
          {title}
        </div>
        <div className="truncate text-xs text-[var(--fg-3)]">{desc}</div>
      </div>
      {active && (
        <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500 shadow-[0_0_10px_var(--accent-glow)]" />
      )}
    </button>
  );
}

// =============================================================================
// Icons (inline SVG — keep PlatformPicker self-contained, no icon-pack import).
// =============================================================================

function WebIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function DesktopIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="13" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 16v5" />
    </svg>
  );
}

function MobileIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  );
}

function CheckIcon({
  className,
  style,
}: {
  className: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12l4.5 4.5L19 7" />
    </svg>
  );
}
