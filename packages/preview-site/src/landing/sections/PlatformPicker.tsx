/**
 * @file PlatformPicker.tsx
 * @description "Choose your target" platform section.
 *
 * Two visual variants share the same store wiring:
 *
 *   - Default (landing page hero-adjacent): three large rich cards
 *     stacked side-by-side. Each card carries an icon, the platform's
 *     name, a long description, three deploy-shape bullets, and a
 *     pill-styled affordance ("Try this target →"). The active card
 *     gets a brand-tinted border + radial wash. The whole card is the
 *     click target — selecting it writes through the shell store, so
 *     every other surface (params panel, preview iframe, CLI output)
 *     reacts via `snapToPlatform`.
 *
 *     Subtle 3D tilt on hover (CSS perspective + `--rx` / `--ry`)
 *     keeps the cards alive without a JS animation lib.
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
  forwardRef,
  useCallback,
  useRef,
} from 'react';

import { coercePlatform, type Platform } from '@/lib/params-schema';
import { useShellStore } from '@/shell/store';

import { useI18n, type I18nKey } from '../theme/i18n';

import {
  LaptopMockup,
  MonitorMockup,
  PhonesMockup,
} from './device-mockups';

// =============================================================================
// Option schema
// =============================================================================

/**
 * Per-platform 3D pose for the device mockup. Three numbers fully
 * describe how the device sits in front of the card surface:
 *
 *   - `rotY`  Yaw, in degrees. Negative = device's right side comes
 *             toward the camera; positive = its left side does.
 *   - `rotX`  Pitch, in degrees. Positive tilts the top of the device
 *             back from the camera (we look slightly down at it).
 *   - `tz`    Translate-Z, in pixels. Pushes the device toward the
 *             camera so it visibly floats in front of the card.
 *             Higher = closer = larger foreshortened size.
 *
 * Each platform gets a slightly different pose so the trio reads as
 * a curated still life (three distinct hero shots) rather than the
 * same prop rotated three times.
 */
interface DevicePose {
  rotY: number;
  rotX: number;
  tz: number;
}

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
  /** Device-mockup hero visual used by the rich landing variant. */
  Mockup: (props: {
    active: boolean;
    className?: string;
    style?: CSSProperties;
  }) => ReactNode;
  /** Static 3D pose of this card's mockup. See `DevicePose`. */
  pose: DevicePose;
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
    Mockup: LaptopMockup,
    // Laptop: as if photographed from over the user's left shoulder.
    // The right edge of the screen tilts toward the camera.
    pose: { rotY: -14, rotX: 8, tz: 60 },
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
    Mockup: MonitorMockup,
    // Monitor: mirrors the laptop — viewed from over the right
    // shoulder so the trio's middle card "anchors" the symmetry.
    pose: { rotY: 12, rotX: 6, tz: 50 },
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
    Mockup: PhonesMockup,
    // Phones: gentler yaw than the laptop (they're already rotated
    // inside the SVG), but pushed closer to the camera so the trio
    // reads as "closest to the viewer = the most personal device".
    pose: { rotY: -10, rotX: 6, tz: 75 },
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

  // -- Hooks (declared unconditionally so the rich variant's keyboard
  //          nav + spotlight refs survive the compact branch's early
  //          return — React's rules-of-hooks insist on stable ordering). 
  // ------------------------------------------------------------------------

  // Refs to each card button. Used by the radiogroup keyboard handler
  // to move focus between siblings on Arrow keys.
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Keyboard nav: arrow keys cycle through the trio with wrap-around.
  const handleKeyDown = useCallback(
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
      const idx = OPTIONS.findIndex((o) => o.value === current);
      const dir = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
      const nextIdx = (idx + dir + OPTIONS.length) % OPTIONS.length;
      setParam('platform', OPTIONS[nextIdx].value);
      buttonRefs.current[nextIdx]?.focus();
    },
    [current, setParam]
  );

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
    <section
      id={PLATFORM_PICKER_ANCHOR_ID}
      className="mx-auto w-full max-w-7xl px-6 py-28 sm:py-32"
      aria-labelledby="platform-title"
    >
      {/* ---- Editorial heading -----------------------------------------
          `mb-20 sm:mb-28` (was `mb-14`) gives the device mockups
          enough room to break free of their cards (each device's
          `top:-12%` overflow lands inside this gap, ~28-40px) without
          crowding the subtitle. Previously the device overflow ate
          most of the 56px gap and the title felt squeezed. */}
      <div className="relative mb-20 text-center sm:mb-28">
        <p className="mb-4 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--fg-4)]">
          <span className="h-px w-8 bg-[var(--border-2)]" />
          {t('platform.eyebrow')}
          <span className="h-px w-8 bg-[var(--border-2)]" />
        </p>
        <h2
          id="platform-title"
          className="text-4xl font-semibold tracking-tight text-[var(--fg-1)] sm:text-5xl"
        >
          {t('platform.title')}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-[var(--fg-3)] sm:text-base">
          {t('platform.subtitle')}
        </p>
        <p className="mt-5 text-xs text-[var(--fg-4)]">
          <kbd className="rounded border border-[var(--border-1)] bg-[var(--surface-1)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--fg-3)]">
            ←
          </kbd>{' '}
          <kbd className="rounded border border-[var(--border-1)] bg-[var(--surface-1)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--fg-3)]">
            →
          </kbd>{' '}
          {t('platform.keyboardHint')}
        </p>
      </div>

      {/* ---- Cards ------------------------------------------------------
        The grid carries the shared 3D viewpoint via `perspective`. The
        value (1100px) is the camera-to-card distance — smaller numbers
        push the camera closer, exaggerating depth; larger numbers
        flatten everything. 1100px keeps the laptop's far edge visibly
        smaller than its near edge without distorting the screen
        content into illegibility. */}
      <div
        role="radiogroup"
        aria-label={t('platform.title')}
        onKeyDown={handleKeyDown}
        className="relative grid grid-cols-1 gap-5 lg:grid-cols-3"
        style={
          {
            perspective: '1100px',
            perspectiveOrigin: '50% 35%',
          } as CSSProperties
        }
      >
        {OPTIONS.map((opt, i) => {
          const active = opt.value === current;
          const hasActiveSibling = !active;
          return (
            <RichPlatformCard
              key={opt.value}
              ref={(el) => {
                buttonRefs.current[i] = el;
              }}
              index={i}
              active={active}
              dimmed={hasActiveSibling}
              title={t(opt.titleKey)}
              desc={t(opt.descKey)}
              bullets={opt.bulletKeys.map((k) => t(k))}
              ctaLabel={t('outputs.tryNow')}
              selectedLabel={t('platform.selectedBadge')}
              Mockup={opt.Mockup}
              pose={opt.pose}
              onSelect={() => setParam('platform', opt.value)}
            />
          );
        })}
      </div>

      {/* Locale tap helper — small but ensures the i18n hook re-runs in
        SSR-style snapshots that re-mount on language change. Inert. */}
      <span className="sr-only" aria-hidden="true" data-lang={lang} />
    </section>
  );
}

// =============================================================================
// Rich card (default landing variant)
// =============================================================================

/**
 * Rich platform card — device-mockup hero, editorial chapter number,
 * title, long description, three feature bullets, a CTA-styled footer
 * affordance, and a SELECTED badge when this card is the active one.
 *
 * The whole card is a single `<button role="radio">`; the inner
 * "Try this target →" is decorative (a `<span>`), so the visitor can
 * click anywhere on the card to select.
 *
 * Visual structure:
 *
 *   ┌──────────────────────────────────┐
 *   │  01                  [SELECTED]  │  ← chapter number + state badge
 *   │      [Device mockup]             │     (each translateZ-lifted to
 *   │                                  │      stay above the device)
 *   ├──────────────────────────────────┤
 *   │  Title                           │
 *   │  Long-form description …         │
 *   │  ✓ bullet 1                      │
 *   │  ✓ bullet 2                      │
 *   │  ✓ bullet 3                      │
 *   │  [ Try this target → ]           │
 *   └──────────────────────────────────┘
 *
 * 3D scene model:
 *
 *   1. The parent grid container carries `perspective: 1100px` — that
 *      sets up the camera-to-scene distance for the whole row of cards.
 *   2. Each card is a child of that scene. The card itself uses
 *      `transform-style: preserve-3d` so its own children participate
 *      in the same 3D space, and applies `rotateX/Y` from the cursor
 *      position for the existing tilt-on-hover behaviour.
 *   3. The device mockup carries a STATIC `translateZ(60–80px)` plus a
 *      per-platform `rotateY/X` (the `pose` prop) so it floats off the
 *      card surface at a curated angle. Active state adds another
 *      `+25px` of Z so the selected device visibly rises.
 *   4. Decorative text on the hero strip (chapter number, SELECTED
 *      badge) carries an even larger `translateZ(110px)` so it stays
 *      in front of the device in the 3D paint order — `z-index` does
 *      not work inside a `preserve-3d` context.
 *
 * Interactions:
 *
 *   - Hover-driven tilt: cursor offset → `--rx` / `--ry` CSS vars on
 *     the card. The device, sitting forward in Z, swings further than
 *     the card surface — the parallax sells the "floating in front
 *     of the card" illusion without any extra JS.
 *
 *   - Active card: animated gradient border (`.eikon-active-border`,
 *     see index.css), 1.025× card scale, +25px device translateZ,
 *     warm-violet drop shadow on the device, brand-coloured details
 *     inside the SVG, SELECTED badge.
 *
 *   - Dimmed siblings: when *any* card is active, the others fade to
 *     opacity 0.72 and their device desaturates to 55% so the active
 *     one feels "in focus". Hover restores both to 100% so visitors
 *     can preview without committing.
 *
 *   - Inactive (no card active yet): plain border, hover lifts the
 *     border and previews the brand wash behind the mockup.
 */
interface RichPlatformCardProps {
  index: number;
  active: boolean;
  dimmed: boolean;
  title: string;
  desc: string;
  bullets: ReadonlyArray<string>;
  ctaLabel: string;
  selectedLabel: string;
  Mockup: (props: {
    active: boolean;
    className?: string;
    style?: CSSProperties;
  }) => ReactNode;
  pose: DevicePose;
  onSelect: () => void;
}

const RichPlatformCard = forwardRef<HTMLButtonElement, RichPlatformCardProps>(
  function RichPlatformCard(
    {
      index,
      active,
      dimmed,
      title,
      desc,
      bullets,
      ctaLabel,
      selectedLabel,
      Mockup,
      pose,
      onSelect,
    },
    ref
  ) {
    // Mouse-driven 3D tilt. We update CSS vars on the button itself
    // so the rotation composes with the scale / translateZ in a
    // single transform, ensuring the rounded frame AND its content
    // tilt as one unit (decoupling them visually splits the card
    // into a flat frame + tilted content, which looks broken).
    const onMouseMove = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        const el = e.currentTarget;
        const rect = el.getBoundingClientRect();
        const dx = (e.clientX - rect.left) / rect.width - 0.5;
        const dy = (e.clientY - rect.top) / rect.height - 0.5;
        el.style.setProperty('--rx', `${(-dy * 5).toFixed(2)}deg`);
        el.style.setProperty('--ry', `${(dx * 5).toFixed(2)}deg`);
      },
      []
    );
    const onMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        const el = e.currentTarget;
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      },
      []
    );

    // Card transform composition. We layer four sources of motion
    // into a single `transform` so the rounded frame + content tilt
    // as one rigid panel:
    //
    //   - `translateZ(cardZ + --hover-tz)`  base lift (10px active,
    //                                       0 idle) + hover bump
    //                                       (3px when pointed at).
    //   - `scale(cardScale * --press-scale)` base scale (1.012 active,
    //                                        1 idle) × press dip
    //                                        (0.985 on mouse-down).
    //   - `rotateX(var(--rx))` + `rotateY(var(--ry))`
    //                                       mouse-tracked tilt
    //                                       (set by onMouseMove,
    //                                       max ±2.5°).
    //
    // ┌─ Why the Z / scale numbers are this small ──────────────────┐
    // │                                                             │
    // │ The grid's perspective origin sits at (50%, 35%) of the     │
    // │ section. Each device hero sits well off that origin (top-   │
    // │ right corner of its card, ~180px horizontal from the        │
    // │ origin). When a card moves in Z, perspective projects that  │
    // │ Z motion into screen-XY drift — roughly:                    │
    // │                                                             │
    // │     drift_px ≈ offset_to_origin × (Δz / perspective)        │
    // │                                                             │
    // │ At our previous +18 (card) +25 (device) = 43 px total Z     │
    // │ lift, the side cards drifted ~6-8 px horizontally on every  │
    // │ click. That read as the device "jumping" / "misaligning"    │
    // │ — *not* an animation-timing bug, a geometric necessity.     │
    // │                                                             │
    // │ Locking the device's pose (see deviceTZ below) and capping  │
    // │ the card's combined Z+hover at ~13 px keeps every drift     │
    // │ under 1.5 px, comfortably inside subpixel-noise territory.  │
    // └─────────────────────────────────────────────────────────────┘
    //
    // The transition timing got longer (260ms ease-out-cubic) so the
    // remaining tiny scale/Z settle reads as a graceful confirmation
    // beat, not a pop. Cursor-driven --rx/--ry still feels live
    // because mousemove fires every frame and overrides the eased
    // value immediately.
    const cardZ = active ? 10 : 0;
    const cardScale = active ? 1.012 : 1;

    // Device pose: per-platform static pitch/yaw + a translateZ that
    // lifts the device toward the camera. INVARIANT across active /
    // inactive — see the perspective-drift note above. Selection is
    // communicated by the brand drop-shadow (filter), the card's
    // gradient border, and the badge — not by moving the device.
    const deviceTZ = pose.tz;
    const deviceTransform = `translateZ(${deviceTZ}px) rotateY(${pose.rotY}deg) rotateX(${pose.rotX}deg)`;

    // Tailwind doesn't ship `eikon-active-border` (it's a one-off in
    // index.css); when active we drop the `border-…` class entirely
    // and rely on the custom class to paint the gradient border on
    // top.
    //
    // NOTE: dropped `overflow-hidden` from the card so the device's
    // 3D depth doesn't get clipped at the card boundary. The card
    // still reads as a clean rounded rectangle because every visible
    // child stays within its bounds at rest; only the device's drop
    // shadow occasionally extends a couple of pixels past the edge,
    // which sells the "floating above the card" illusion. We also
    // intentionally avoid `overflow: clip` here for the same reason.
    const containerClass =
      'group relative flex flex-col rounded-2xl text-left outline-none cursor-pointer ' +
      (active
        ? 'eikon-active-border z-10 shadow-[0_36px_80px_-30px_rgb(139_92_246/0.6)] '
        : 'border border-[var(--border-1)] bg-[var(--surface-1)] hover:border-[var(--border-2)] hover:[--hover-tz:3px] ') +
      (dimmed ? 'opacity-[0.72] hover:opacity-100 ' : '') +
      'active:[--press-scale:0.985] ' +
      'focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)]';

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={active}
        tabIndex={active ? 0 : -1}
        onClick={onSelect}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={
          {
            // `--rx` / `--ry` are inline because JS sets them on
            // mousemove. `--hover-tz` and `--press-scale` are NOT
            // initialised inline — we let `var(..., default)` carry
            // the rest-state value so the `hover:` and `active:`
            // utilities below (lower specificity than inline) can
            // actually override them. If we initialised them inline,
            // the hover class would silently lose to the inline rule.
            '--rx': '0deg',
            '--ry': '0deg',
            transform: `translateZ(calc(${cardZ}px + var(--hover-tz, 0px))) scale(calc(${cardScale} * var(--press-scale, 1))) rotateX(var(--rx)) rotateY(var(--ry))`,
            transformStyle: 'preserve-3d',
            // 260ms ease-out-cubic on transform: long enough that the
            // active-state Z+scale settle reads as a graceful "lock
            // in" rather than a pop, short enough that cursor-driven
            // --rx/--ry still feels live (mousemove fires every frame
            // and immediately overrides the eased value).
            // box-shadow gets the longest fade so the active card's
            // brand glow blooms in elegantly.
            transition:
              'transform 260ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 380ms ease-out, opacity 260ms ease-out, border-color 220ms ease-out',
          } as CSSProperties
        }
        className={containerClass}
      >
        {/* ---- Hero visual strip ---------------------------------------
          IMPORTANT: this strip carries `transform-style: preserve-3d`
          and intentionally has no `overflow: hidden`. The device
          inside lives in 3D space (it has `translateZ`), so clipping
          here would (a) cut off the cast shadow that sells "floating
          above the card", and (b) make foreshortened edges flicker as
          the card rotates with the mouse.
          
          We keep the gradient + dotted grid + brand wash as
          `absolute inset-0` siblings so they remain inside the
          strip's natural rectangle even with overflow visible. */}
        <div
          className={
            'relative aspect-[5/3] border-b transition-colors duration-300 ' +
            (active
              ? 'border-brand-500/25'
              : 'border-[var(--border-1)] group-hover:border-[var(--border-2)]')
          }
          style={{
            background:
              'linear-gradient(180deg, var(--surface-2) 0%, var(--surface-0) 100%)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Dotted grid background — subtle texture so the mockup
            doesn't float against a flat panel. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '14px 14px',
            }}
          />
          {/* Brand radial wash — fully visible on the active card,
            faintly previewed on hover for a sibling. */}
          <span
            aria-hidden="true"
            className={
              'pointer-events-none absolute inset-0 transition-opacity duration-300 ' +
              (active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60')
            }
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(139, 92, 246, 0.22), transparent 70%)',
            }}
          />

          {/* Chapter number — editorial-style "01 / 02 / 03" in a
            mono-spaced typeface at the top-left corner. Faint enough
            to read as a decorative mark, not a label.
            
            `translateZ(110px)` parks the label slightly in front of
            the device so it never gets occluded when the device's
            tilted edge bulges into the corner — important because in
            a `preserve-3d` scene, paint order is governed by z, not
            DOM order or `z-index`. */}
          <span
            aria-hidden="true"
            className={
              'pointer-events-none absolute top-3 left-4 font-mono text-xs tracking-wider transition-colors duration-300 ' +
              (active ? 'text-brand-300' : 'text-[var(--fg-4)]')
            }
            style={{ transform: 'translateZ(110px)' }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>

          {/* SELECTED badge — pill in the top-right, only on the
            active card. Pulsing dot to draw the eye, brand colours
            throughout. Same `translateZ` reasoning as the chapter
            number above. */}
          {active && (
            <span
              aria-hidden="true"
              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-brand-500/40 bg-brand-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-brand-200 backdrop-blur-sm"
              style={{ transform: 'translateZ(110px)' }}
            >
              <span className="eikon-pulse-glow inline-block h-1 w-1 rounded-full bg-brand-300 shadow-[0_0_6px_var(--accent-glow)]" />
              {selectedLabel}
            </span>
          )}

          {/* ----- Device ---------------------------------------------
            The mockup intentionally *breaks out* of the hero strip's
            top-right corner via negative `top` + `right`. We want the
            visual reading "the device has leapt off the card", so:
            
              - `width: 100%` + `aspectRatio: 5/3` lock the SVG to the
                strip's native aspect ratio, sized to fill it.
              - `top: -12%` pushes the device's top edge above the
                strip into the section's vertical whitespace between
                the heading and the cards. That whitespace is now
                ~80-112px (heading's `mb-20 sm:mb-28`), so 12% × ~240px
                ≈ 29px of overflow lands inside it with plenty of room
                to breathe (was -20% / ~48px, which crowded the title).
              - `right: -5%` pushes the device's right edge ~20px past
                the card's right border — exactly the width of the
                `gap-5` between cards, so each device just kisses (but
                doesn't crash into) its right-hand neighbour.
            
            Every card breaks out the SAME way (top + right), so the
            trio reads as a choreographed set rather than three
            unrelated cards drifting in different directions.
            
            The hero strip's natural rectangle (background + grid +
            radial wash) is still rendered *behind* the device, so the
            card frame still reads as a frame even though its hero
            content escapes the boundary.
            
            `transformOrigin: 70% 55%` shifts the 3D pivot toward the
            device's right-of-centre area so the static yaw feels
            anchored to the corner it's emerging from — purely a
            cosmetic touch that sells the gesture.
            
            Drop shadows: two stacked `drop-shadow(…)` calls give a
            tight contact shadow + long soft cast shadow, which is
            what makes the device read as "physically sitting in
            front of the card" rather than "pasted on top". Active
            adds a third pass of warm violet so the selected card
            glows a touch. */}
          <Mockup
            active={active}
            className="pointer-events-none absolute"
            style={{
              top: '-12%',
              right: '-5%',
              width: '100%',
              aspectRatio: '5 / 3',
              transform: deviceTransform,
              transformStyle: 'preserve-3d',
              transformOrigin: '70% 55%',
              // Filter structure is INVARIANT across all states:
              //
              //   drop-shadow(contact) drop-shadow(cast) drop-shadow(brand glow) saturate
              //
              // We hold the function list fixed and only animate the
              // PARAMETERS — that's the only way CSS knows how to
              // interpolate `filter`. If the function count or order
              // changes (e.g. saturate present in one state and not
              // the other, or different function types at the same
              // index), the transition aborts and `filter` *jumps*
              // instantly to the new value, which is exactly the
              // "device jumps on click/hover" bug we used to have.
              //
              // The "invisible" function values:
              //   - active off:  3rd drop-shadow has 0 alpha (no glow)
              //   - active on:   saturate(1) (no desaturation)
              //   - dimmed off:  saturate(1)
              //   - dimmed on:   saturate(0.55)
              filter:
                (active
                  ? 'drop-shadow(0 12px 14px rgba(0,0,0,0.45)) drop-shadow(0 38px 44px rgba(0,0,0,0.55)) drop-shadow(0 0 30px rgba(167,139,250,0.30))'
                  : 'drop-shadow(0 10px 12px rgba(0,0,0,0.42)) drop-shadow(0 30px 38px rgba(0,0,0,0.48)) drop-shadow(0 0 30px rgba(167,139,250,0))') +
                ` saturate(${dimmed ? '0.55' : '1'})`,
              // The device's `transform` is now invariant across
              // active/inactive (see the perspective-drift note in
              // the card), so the transform transition mostly exists
              // for safety + future tweaks — in practice nothing on
              // this property animates on a state flip. `filter` is
              // the real workhorse here, fading the violet brand
              // glow in/out for the selected device. We give it
              // 320ms so the glow blooms in unhurried.
              transition:
                'transform 260ms cubic-bezier(0.22, 1, 0.36, 1), filter 320ms ease-out',
              willChange: 'filter',
            }}
          />
        </div>

        {/* ---- Text content -------------------------------------------- */}
        <div className="relative flex flex-1 flex-col p-6">
          <h3 className="text-xl font-semibold text-[var(--fg-1)]">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--fg-3)]">
            {desc}
          </p>

          <ul className="mt-5 flex flex-col gap-2 text-sm text-[var(--fg-2)]">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <CheckIcon
                  className={
                    'mt-0.5 h-4 w-4 shrink-0 ' +
                    (active ? 'text-brand-400' : 'text-[var(--fg-3)]')
                  }
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          {/* CTA-styled footer affordance. NOT a real <button> — the
            outer card is already a clickable radio. Pure decoration
            that visually telegraphs "this card is interactive".
            Hover bumps the CTA's text + border in 220ms (was the
            Tailwind default of 150ms) so it lands on the same beat
            as the card's outer transform settle. */}
          <span
            className={
              'mt-6 inline-flex w-fit items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors duration-200 ' +
              (active
                ? 'border-brand-500/50 bg-brand-500/10 text-brand-300'
                : 'border-[var(--border-1)] bg-[var(--surface-2)] text-[var(--fg-2)] group-hover:border-brand-500/30 group-hover:text-[var(--fg-1)]')
            }
          >
            {ctaLabel}
          </span>
        </div>
      </button>
    );
  }
);

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

function CheckIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
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
