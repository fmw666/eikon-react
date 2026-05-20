/**
 * @file QASection.tsx
 * @description SuperWhisper-grade "Support" section.
 *
 * Two-column layout on `lg+`:
 *
 *   ┌──────────────────────────────┬────────────────────────────┐
 *   │  •  SUPPORT                  │                            │
 *   │  Frequently asked            │                            │
 *   │  questions                   │                            │
 *   │                              │                            │
 *   │  │ Q1 ──────────────────  ▲  │  Can't find what you're    │
 *   │    A1 (open, faded in)       │  looking for? Email …      │
 *   │  ─ Q2 ──────────────────  ▼  │                            │
 *   │  ─ Q3 ──────────────────  ▼  │  ┌─────────────────────┐   │
 *   │  ─ Q4 ──────────────────  ▼  │  │ Contact author   →  │   │
 *   │                              │  └─────────────────────┘   │
 *   │                              │  fmw…@gmail.com            │
 *   └──────────────────────────────┴────────────────────────────┘
 *
 * Polish budget — what makes this feel crafted, not stock:
 *
 *   1. Eyebrow has a small brand-coloured glow dot — a pixel-sized
 *      design touch that signals "this section was thought about".
 *   2. Open accordion item shows a 1px brand-coloured rail on its
 *      left edge — semantic anchor for "this is the active answer".
 *   3. Chevron lives inside a small surface well that fades up when
 *      the item opens (suggests "pressed in" state).
 *   4. Answer body fades in on open (delayed by ~120ms) on top of the
 *      grid-rows height transition, so the content arrives after the
 *      panel has unfolded instead of being clipped during travel.
 *   5. Contact pill is a layered ceramic surface:
 *        - Top-down gradient (surface-2 → surface-1) for body.
 *        - Inset 1px top highlight to lift the upper edge.
 *        - Tight close shadow + softer outer halo for depth.
 *        - Arrow sits in a slightly darker round well (button-in-button),
 *          and slides 2px on hover. The whole pill lifts 1px.
 *      Together these read as a tactile object, not flat glass.
 *
 * Single-open accordion behaviour: opening one item closes the
 * others. State is local — readers skim, no need to persist which
 * item was last open across reloads.
 *
 * Height animation: `grid-template-rows: 1fr / 0fr` runs the
 * transition on intrinsic content height, no JS measurement.
 */

import { useState } from 'react';

import { SITE } from '../site-config';
import { useI18n, type I18nKey } from '../theme/i18n';

interface QA {
  qKey: I18nKey;
  aKey: I18nKey;
}

const QAS: ReadonlyArray<QA> = [
  { qKey: 'qa.1.q', aKey: 'qa.1.a' },
  { qKey: 'qa.2.q', aKey: 'qa.2.a' },
  { qKey: 'qa.3.q', aKey: 'qa.3.a' },
  { qKey: 'qa.4.q', aKey: 'qa.4.a' },
  { qKey: 'qa.5.q', aKey: 'qa.5.a' },
  { qKey: 'qa.6.q', aKey: 'qa.6.a' },
];

export function QASection() {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24"
      aria-labelledby="qa-title"
    >
      <div className="grid grid-cols-1 gap-x-20 gap-y-14 lg:grid-cols-[1.5fr_1fr]">
        <div>
          {/* Eyebrow: tiny accent dot + uppercase label. The dot
              shares the brand glow used by Hero badge, tying the two
              sections together. */}
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="inline-block h-1 w-1 rounded-full bg-brand-500 shadow-[0_0_8px_var(--accent-glow)]"
            />
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--fg-3)]">
              {t('qa.eyebrow')}
            </p>
          </div>

          <h2
            id="qa-title"
            className="mt-5 max-w-[14ch] text-3xl font-semibold leading-[1.05] tracking-tight text-[var(--fg-1)] sm:text-4xl"
          >
            {t('qa.title')}
          </h2>

          <ul className="mt-14 flex flex-col">
            {QAS.map((item, idx) => (
              <QAItem
                key={item.qKey}
                question={t(item.qKey)}
                answer={t(item.aKey)}
                isOpen={open === idx}
                onToggle={() =>
                  setOpen((cur) => (cur === idx ? null : idx))
                }
              />
            ))}
          </ul>
        </div>

        <ContactPanel
          text={t('qa.contact.text')}
          ctaLabel={t('qa.contact.cta')}
          email={SITE.author.email}
        />
      </div>
    </section>
  );
}

// =============================================================================
// QA item
// =============================================================================

/**
 * One accordion row. Each row has four signal layers:
 *
 *   1. Open state          — left brand rail (1px, fades in).
 *   2. Question text       — colour lifts from `--fg-2` → `--fg-1`
 *                            on open OR hover; transition is 220ms
 *                            so it doesn't feel laggy.
 *   3. Chevron container   — small surface well that materialises
 *                            (border + bg fade-in) when the item
 *                            opens; chevron rotates 180°.
 *   4. Answer reveal       — grid-rows height transition + opacity
 *                            fade-in on the inner <p>. The opacity
 *                            transition is delayed by ~120ms so the
 *                            text doesn't render mid-unfold.
 *
 * Hairline divider at the bottom of every item, suppressed on the
 * last child so the list doesn't sprout a trailing line under empty
 * space.
 */
function QAItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="group/qa relative border-b border-[var(--border-1)] last:border-b-0">
      {/* Active-state left rail. Quiet 1-pixel marker — was a brand
          line with a soft halo, dropped the halo so this section
          stays calm relative to the playground section's accent
          chrome above. */}
      <span
        aria-hidden="true"
        className={
          'pointer-events-none absolute left-0 top-0 bottom-0 w-px bg-[var(--fg-3)] transition-opacity duration-300 ' +
          (isOpen ? 'opacity-100' : 'opacity-0')
        }
      />

      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-6 py-6 pl-5 pr-1 text-left"
      >
        <span
          className={
            'text-[15px] font-medium leading-snug tracking-tight transition-colors duration-200 sm:text-base ' +
            (isOpen
              ? 'text-[var(--fg-1)]'
              : 'text-[var(--fg-2)] group-hover/qa:text-[var(--fg-1)]')
          }
        >
          {question}
        </span>

        <ChevronWell open={isOpen} />
      </button>

      {/* Height transition (grid-rows trick) + content opacity. The
        outer grid animates between 0fr and 1fr; the inner overflow
        hidden clips during travel, and the <p> fades in once the
        unfold is mostly done. */}
      <div
        className="grid transition-[grid-template-rows] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p
            className={
              'pb-7 pl-5 pr-12 text-sm leading-relaxed text-[var(--fg-3)] transition-opacity duration-300 ' +
              (isOpen ? 'opacity-100 delay-[120ms]' : 'opacity-0')
            }
          >
            {answer}
          </p>
        </div>
      </div>
    </li>
  );
}

/**
 * The right-side toggle indicator. Lives inside a small rounded
 * "well" — when the item is closed it's invisible chrome (the
 * chevron floats on plain background); when the item opens, the
 * well materialises with a soft border + surface fill, signalling
 * "this control is active". Combined with the 180° rotation it gives
 * a satisfying tactile feedback.
 */
function ChevronWell({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ease-out ' +
        (open
          ? 'border-[var(--border-2)] bg-[var(--surface-2)] text-[var(--fg-1)] shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]'
          : 'border-transparent bg-transparent text-[var(--fg-3)] group-hover/qa:text-[var(--fg-1)]')
      }
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          'h-3.5 w-3.5 transition-transform duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] ' +
          (open ? 'rotate-180' : 'rotate-0')
        }
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  );
}

// =============================================================================
// Contact panel
// =============================================================================

/**
 * Right-column CTA. Visually anchored to the bottom of the column on
 * `lg+` (the eye naturally lands on the bottom CTA after scanning
 * the questions). Stacks naturally below the accordion on mobile.
 *
 * The button is a layered ceramic pill:
 *
 *   - Gradient body (surface-2 top → surface-1 bottom) gives the
 *     surface a directional read (light from above).
 *   - Inset 1px top highlight further lifts the upper edge.
 *   - Tight close shadow + a wider halo on hover for depth.
 *   - The arrow sits in a slightly darker round well — a "button
 *     inside a button" — and slides 2px right on hover.
 *   - The whole pill lifts 1px on hover and the halo expands.
 *
 * Below the button we show the literal email in a muted mono row so
 * the visitor sees the destination without committing the click —
 * and can copy it if they prefer their own client open.
 */
function ContactPanel({
  text,
  ctaLabel,
  email,
}: {
  text: string;
  ctaLabel: string;
  email: string;
}) {
  return (
    <aside className="flex flex-col self-center lg:max-w-sm lg:self-end lg:pb-4">
      <p className="text-[15px] leading-[1.7] text-[var(--fg-3)]">
        {text}
      </p>

      <a
        href={`mailto:${email}`}
        className="
          group/cta mt-8 inline-flex w-fit items-center gap-3
          rounded-full border border-[var(--border-1)]
          bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface-1)]
          py-1.5 pl-5 pr-1.5
          shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_1px_2px_rgb(0_0_0/0.4),0_4px_12px_rgb(0_0_0/0.08)]
          transition-all duration-200 ease-out
          hover:-translate-y-0.5
          hover:border-[var(--border-2)]
          hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_2px_4px_rgb(0_0_0/0.4),0_10px_24px_rgb(0_0_0/0.2)]
          active:translate-y-0
        "
      >
        <span className="text-sm font-medium tracking-tight text-[var(--fg-1)]">
          {ctaLabel}
        </span>
        <span
          aria-hidden="true"
          className="
            inline-flex h-8 w-8 items-center justify-center rounded-full
            bg-[var(--surface-0)] text-[var(--fg-1)]
            shadow-[inset_0_1px_0_rgb(255_255_255/0.04),inset_0_-1px_0_rgb(0_0_0/0.4)]
            transition-transform duration-200 ease-out
            group-hover/cta:translate-x-0.5
          "
        >
          <ArrowRight />
        </span>
      </a>

      {/* Destination preview. Mono + muted so it reads as metadata,
          not a second CTA. Lets the visitor read the email without
          opening their mail client. */}
      <p className="mt-4 font-mono text-xs text-[var(--fg-4)]">
        {email}
      </p>
    </aside>
  );
}

// =============================================================================
// Icons
// =============================================================================

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}
