/**
 * @file CtaButton.tsx
 * @description Codex.io-flavoured call-to-action button.
 *
 * Visual language is a faithful reproduction of the buttons at
 * https://www.codex.io — distinctive enough to be instantly
 * recognisable, generic enough to work as a building block:
 *
 *   ┌─ outer halo ring (same colour, 2-3px gap) ────────────────────────┐
 *   │  ┌─ solid block (lime fill / black text) ─────────────────────┐    │
 *   │  │  ✦  GET STARTED                                            │    │
 *   │  └─────────────────────────────────────────────────────────────┘    │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * The halo-with-gap is implemented with CSS `outline` +
 * `outline-offset` (not `ring`, which uses box-shadow and won't let
 * us animate width and offset together cleanly). The gap between the
 * button and the halo isn't a fill — it's the page background
 * showing through, so the effect works in both light and dark
 * themes without per-mode tuning (codex.io is dark-only; we have to
 * be theme-aware).
 *
 * Hover gives two simultaneous cues:
 *
 *   1. Word-reveal: the label is rendered twice, stacked vertically
 *      inside an `overflow-hidden` viewport. On hover, the top copy
 *      slides up by 110% and the bottom copy slides into place — a
 *      Codex signature.
 *   2. Halo tightening: the offset shrinks by 1px and the ring
 *      thickens by 1px, so the button feels like it's "pulling in"
 *      under the cursor without changing size.
 *
 * `variant` controls the colour story:
 *
 *   - "primary"   : lime fill + black text + lime halo. The "money"
 *                   button, used for the page's #1 action.
 *   - "secondary" : surface fill + white text + border. Sits beside
 *                   a primary as a softer alternative.
 *
 * The component renders as either `<a>` (when `href` is set) or
 * `<button>` (when `onClick` is set) — never both. This keeps the
 * semantics correct for screen-readers while letting callers pick
 * the right element by the intent of their action.
 */

import type { ReactNode } from 'react';

export type CtaButtonVariant = 'primary' | 'secondary';

type CommonProps = {
  /** Visible label. Rendered in uppercase via CSS; pass the natural-case
   *  string. Two stacked copies of this string drive the word-reveal
   *  hover effect. */
  children: ReactNode;
  /** Icon shown to the left of the label. Defaults to a sparkle for
   *  primary buttons; secondary buttons render nothing by default. */
  leadingIcon?: ReactNode;
  /** Optional icon to the right of the label — handy when the action
   *  has a direction (e.g. ↓ to scroll, → to navigate). */
  trailingIcon?: ReactNode;
  /** Visual story. See file header. */
  variant?: CtaButtonVariant;
  /** Extra utility classes — appended last so callers can override. */
  className?: string;
};

type AnchorProps = CommonProps & {
  href: string;
  onClick?: never;
  target?: string;
  rel?: string;
  type?: never;
};

type ButtonProps = CommonProps & {
  href?: never;
  onClick: () => void;
  target?: never;
  rel?: never;
  type?: 'button' | 'submit';
};

export type CtaButtonProps = AnchorProps | ButtonProps;

export function CtaButton(props: CtaButtonProps) {
  const {
    children,
    leadingIcon,
    trailingIcon,
    variant = 'primary',
    className = '',
  } = props;

  // Resolve the per-variant token bundle once so the JSX below stays
  // about composition, not branching.
  const tokens = variant === 'primary' ? PRIMARY_TOKENS : SECONDARY_TOKENS;

  // Inner block — all the colour lives here. We deliberately drive
  // outline (width / offset / colour) and shadow via Tailwind classes
  // only, so per-variant `hover:*` modifiers can override the resting
  // state without losing to a higher-priority inline style.
  const blockClasses = [
    'group/cta relative inline-flex items-center gap-2',
    'rounded-[6px] px-5 py-2.5',
    'text-[11px] font-bold uppercase leading-none tracking-[0.14em]',
    'no-underline cursor-pointer select-none',
    'transition-[box-shadow,outline-offset,outline-width,background-color,color] duration-300 ease-out',
    tokens.surface,
    tokens.ring,
  ].join(' ');

  const content = (
    <>
      {leadingIcon !== undefined ? (
        <span aria-hidden="true" className={tokens.icon}>
          {leadingIcon}
        </span>
      ) : variant === 'primary' ? (
        <span aria-hidden="true" className={tokens.icon}>
          <SparkleIcon className="h-3 w-3" />
        </span>
      ) : null}

      <WordReveal>{children}</WordReveal>

      {trailingIcon !== undefined ? (
        <span aria-hidden="true" className={tokens.icon}>
          {trailingIcon}
        </span>
      ) : null}
    </>
  );

  if (isAnchor(props)) {
    return (
      <a
        href={props.href}
        target={props.target}
        rel={props.rel}
        className={`${blockClasses} ${className}`}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={props.type ?? 'button'}
      onClick={props.onClick}
      className={`${blockClasses} ${className}`}
    >
      {content}
    </button>
  );
}

// =============================================================================
// Variant tokens
// =============================================================================

/**
 * Lime-on-black, signature codex.io look.
 *
 * The `outline` carries the halo: solid lime stroke with a 3px gap
 * (`outline-offset`) filled by the page background. On hover the gap
 * tightens by 1px and the stroke thickens by 1px — the button feels
 * like it focuses without leaping forward.
 *
 * The glow shadow is a soft lime bloom; it's a touch dim at rest and
 * doubles on hover.
 */
const PRIMARY_TOKENS = {
  surface:
    'bg-[#c5f217] text-black ' +
    'shadow-[0_0_28px_-6px_rgba(197,242,23,0.55)] ' +
    'hover:shadow-[0_0_38px_-2px_rgba(197,242,23,0.9)]',
  ring:
    'outline outline-1 outline-[#c5f217] outline-offset-[3px] ' +
    'hover:outline-2 hover:outline-offset-[2px] ' +
    'focus-visible:outline-2 focus-visible:outline-offset-[2px]',
  icon: 'inline-flex items-center text-black',
} as const;

/**
 * Surface-on-border, the soft alternative. No halo — the secondary
 * button is supposed to recede next to a primary. Hover only nudges
 * the border opacity and the foreground colour.
 */
const SECONDARY_TOKENS = {
  surface:
    'bg-[var(--surface-1)] text-[var(--fg-2)] ' +
    'hover:text-[var(--fg-1)] hover:bg-[var(--surface-2)]',
  ring:
    'outline outline-1 outline-[var(--border-2)] outline-offset-0 ' +
    'hover:outline-[var(--fg-4)] ' +
    'focus-visible:outline-2 focus-visible:outline-offset-[2px] ' +
    'focus-visible:outline-[var(--fg-3)]',
  icon: 'inline-flex items-center text-[var(--fg-3)] group-hover/cta:text-[var(--fg-1)]',
} as const;

// =============================================================================
// Internals
// =============================================================================

function isAnchor(props: CtaButtonProps): props is AnchorProps {
  return 'href' in props && typeof props.href === 'string';
}

/**
 * Two stacked label copies inside an `overflow-hidden` viewport. The
 * idle copy is visible; the active copy waits one line below. On
 * hover, both translate up by 110% so the idle exits the top and the
 * active enters from the bottom.
 *
 * `110%` (not `100%`) keeps the descender of letters like "p", "g"
 * from peeking through during the transition — at line-height 1 the
 * gap is invisible, but a font with descenders still benefits from
 * the small over-travel.
 */
function WordReveal({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex items-center overflow-hidden">
      <span className="block transition-transform duration-300 ease-out group-hover/cta:-translate-y-[110%]">
        {children}
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center translate-y-[110%] transition-transform duration-300 ease-out group-hover/cta:translate-y-0"
      >
        {children}
      </span>
    </span>
  );
}

/**
 * Four-point sparkle — the codex.io primary CTA mark. Drawn as two
 * crossing diamonds so it reads as "energy" rather than "star".
 *
 * Inline so callers don't need to ship an SVG file just to use the
 * default icon.
 */
function SparkleIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" />
    </svg>
  );
}
