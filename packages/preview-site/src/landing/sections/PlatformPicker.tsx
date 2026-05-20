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
      className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20"
      aria-labelledby="platform-title"
    >
      {/* ---- Editorial heading -----------------------------------------
          Compact heading on purpose. This section is the SECOND step
          on the page (after the hero) and a *supporting* surface for
          the playground below it — not a hero in its own right. The
          previous 4xl/5xl + 28px+ vertical padding was visually
          competing with the playground frame for attention; we
          dialled both down so the eye keeps moving toward the
          playground as the focal point. */}
      <div className="mb-10 text-center sm:mb-12">
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

      {/* ---- Cards ------------------------------------------------------
          Flat cards in a plain grid — intentionally NO perspective,
          NO mouse-tracked tilt, NO 3D pose on the devices. Selection
          state is communicated through a tinted border + brand-tinted
          CTA pill + SELECTED badge, which is plenty without painting
          this section as a hero. Keyboard nav still flows through the
          radiogroup. */}
      <div
        role="radiogroup"
        aria-label={t('platform.title')}
        onKeyDown={handleKeyDown}
        className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
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
              active={active}
              dimmed={hasActiveSibling}
              title={t(opt.titleKey)}
              desc={t(opt.descKey)}
              bullets={opt.bulletKeys.map((k) => t(k))}
              ctaLabel={t('outputs.tryNow')}
              selectedLabel={t('platform.selectedBadge')}
              Mockup={opt.Mockup}
              onSelect={() => setParam('platform', opt.value)}
            />
          );
        })}
      </div>

      {/* Keyboard hint — quietly placed under the row so it doesn't
          fight the heading for "look at me" attention. */}
      <p className="mt-4 text-center text-[11px] text-[var(--fg-4)]">
        <kbd className="rounded border border-[var(--border-1)] bg-[var(--surface-1)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--fg-3)]">
          ←
        </kbd>{' '}
        <kbd className="rounded border border-[var(--border-1)] bg-[var(--surface-1)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--fg-3)]">
          →
        </kbd>{' '}
        {t('platform.keyboardHint')}
      </p>

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
 * Rich platform card — quiet, flat, supporting variant.
 *
 * Visual structure (no 3D, no mouse tilt, no chapter labels):
 *
 *   ┌──────────────────────────────────┐
 *   │                                  │
 *   │      [Centered device SVG]       │  ← static preview strip
 *   │                                  │
 *   ├──────────────────────────────────┤
 *   │  Title                           │
 *   │  Short description …             │
 *   │  ✓ bullet 1                      │
 *   │  ✓ bullet 2                      │
 *   │  ✓ bullet 3                      │
 *   │  [ Try this target → ]           │
 *   └──────────────────────────────────┘
 *
 * Why so quiet:
 *
 *   This section sits two steps above the playground frame, which is
 *   the page's actual hero (the live tool the visitor came to play
 *   with). The earlier "3D rich card" variant — perspective camera,
 *   mouse-tracked tilt, animated gradient border, editorial chapter
 *   numbers, +Z-lifted device pose — kept *competing* with the
 *   playground for visual attention. We dropped every bit of motion
 *   that wasn't strictly necessary so the eye flows past these cards
 *   on its way down.
 *
 *   What survived: the bullets (real marketing content about what
 *   each platform target ships), the SELECTED badge (so the choice
 *   reads), and two strictly-bounded animations:
 *
 *     - `eikon-active-border` on the active card — a 1px slate
 *       gradient border whose bright spot sweeps horizontally every
 *       5s. Costs nothing at rest (only the selected card runs it)
 *       and reads as "the choice is live" without painting motion
 *       into the cards the visitor *didn't* pick.
 *
 *     - `eikon-shimmer-hover` on every card — a single diagonal
 *       light streak that crosses the card from left to right when
 *       the cursor enters. Off-canvas at rest, so static screenshots
 *       and prefers-reduced-motion users see no extra motion at all.
 *
 *   That's the entire animation budget for this section — anything
 *   louder would re-introduce the "competing with the playground"
 *   problem we just solved.
 */
interface RichPlatformCardProps {
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
  onSelect: () => void;
}

const RichPlatformCard = forwardRef<HTMLButtonElement, RichPlatformCardProps>(
  function RichPlatformCard(
    {
      active,
      dimmed,
      title,
      desc,
      bullets,
      ctaLabel,
      selectedLabel,
      Mockup,
      onSelect,
    },
    ref
  ) {
    // Layer composition (back-to-front):
    //
    //   1. `eikon-active-border` on the active card paints a 1px slate
    //      gradient ring whose bright spot sweeps horizontally every
    //      5s — the "this one is selected, and alive" signal. The class
    //      also paints the card's inner surface via padding-box, so we
    //      MUST NOT layer a `bg-…` Tailwind class on top of it (would
    //      blow away the gradient ring).
    //
    //   2. Inactive cards get a plain 1px border + a Tailwind bg, with
    //      a hover-only border colour bump.
    //
    //   3. `eikon-shimmer-hover` paints a single diagonal streak across
    //      the card on hover (~800ms sweep). The streak is layered on
    //      a ::before that sits ABOVE the device mockup and inner
    //      content, with `mix-blend-mode: plus-lighter` so it brightens
    //      whatever it crosses without painting a coloured tint. The
    //      streak is invisible at rest (sits off-canvas), so cards are
    //      visually quiet until the cursor lands on them.
    const containerClass =
      'eikon-shimmer-hover group relative flex flex-col rounded-xl text-left outline-none cursor-pointer transition-colors duration-200 ' +
      (active
        ? 'eikon-active-border '
        : 'border border-[var(--border-1)] bg-[var(--surface-1)] hover:border-[var(--border-2)] ') +
      (dimmed ? 'opacity-90 hover:opacity-100 ' : '') +
      'focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)]';

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={active}
        tabIndex={active ? 0 : -1}
        onClick={onSelect}
        className={containerClass}
      >
        {/* ---- Device preview strip ------------------------------------
            Flat hero strip. The device SVG is centred inside, sized
            to ~80% of the strip's width, with a quiet contact shadow.
            No perspective, no tilt, no Z-lift — just an illustration
            telling the reader "this card is the *web* / *desktop* /
            *mobile* target". */}
        <div
          className={
            'relative aspect-[5/3] overflow-hidden border-b transition-colors duration-200 ' +
            (active
              ? 'border-brand-400/30'
              : 'border-[var(--border-1)] group-hover:border-[var(--border-2)]')
          }
          style={{
            background:
              'linear-gradient(180deg, var(--surface-2) 0%, var(--surface-0) 100%)',
          }}
        >
          {/* SELECTED badge — pill in the top-right, only on the
              active card. No glow, no pulse — just a quiet tag. */}
          {active && (
            <span
              aria-hidden="true"
              className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-brand-400/40 bg-brand-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-brand-300 backdrop-blur-sm"
            >
              <span className="inline-block h-1 w-1 rounded-full bg-brand-300" />
              {selectedLabel}
            </span>
          )}

          <Mockup
            active={active}
            className="pointer-events-none absolute inset-0 m-auto"
            style={{
              width: '80%',
              height: '80%',
              filter:
                'drop-shadow(0 8px 10px rgba(0,0,0,0.35)) drop-shadow(0 18px 24px rgba(0,0,0,0.40))' +
                (dimmed ? ' saturate(0.6)' : ''),
              transition: 'filter 240ms ease-out',
            }}
          />
        </div>

        {/* ---- Text content -------------------------------------------- */}
        <div className="relative flex flex-1 flex-col p-5">
          <h3 className="text-base font-semibold text-[var(--fg-1)]">
            {title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg-3)]">
            {desc}
          </p>

          <ul className="mt-4 flex flex-col gap-1.5 text-sm text-[var(--fg-2)]">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <CheckIcon
                  className={
                    'mt-0.5 h-3.5 w-3.5 shrink-0 ' +
                    (active ? 'text-brand-300' : 'text-[var(--fg-4)]')
                  }
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          {/* CTA-styled footer affordance. NOT a real <button> — the
              outer card is already a clickable radio. */}
          <span
            className={
              'mt-5 inline-flex w-fit items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors duration-200 ' +
              (active
                ? 'border-brand-400/40 bg-brand-500/10 text-brand-300'
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
