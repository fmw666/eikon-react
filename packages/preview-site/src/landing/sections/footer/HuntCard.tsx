// =============================================================================
// Hunt card — minimal easter-egg prompt
//
// A small ceramic-surface pill: just a swaying flower icon + the
// single line "Find the hidden flower". The icon is the same bloom
// the visitor will eventually find at the end of the meadow below,
// so once they discover it they instantly recognise the rhyme.
//
// Two quiet animations carry the "go look for it" intent:
//   - the card's accent-glow aura breathes slowly behind it
//   - the flower icon sways gently like grass in wind, then
//     pauses + stands upright on hover ("you've caught it")
//
// Clicking the card smooth-scrolls the wordmark into the centre
// of the viewport so the meadow is right there to be explored.
// =============================================================================

import { type MouseEvent as ReactMouseEvent } from 'react';

import { useI18n } from '../../theme/i18n';

import { MEADOW_ANCHOR_ID } from './constants';

export function HuntCard() {
  const { t } = useI18n();

  function onClick(e: ReactMouseEvent<HTMLAnchorElement>) {
    if (
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }
    e.preventDefault();
    if (typeof document !== 'undefined') {
      const el = document.getElementById(MEADOW_ANCHOR_ID);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  return (
    <a
      href={`#${MEADOW_ANCHOR_ID}`}
      onClick={onClick}
      className="
        group/hunt relative isolate inline-flex w-fit items-center gap-3
        rounded-full border border-[var(--border-1)]
        bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-1)]
        py-2 pl-2 pr-5
        no-underline
        shadow-[inset_0_1px_0_rgb(255_255_255/0.05),0_1px_2px_rgb(0_0_0/0.3)]
        transition-all duration-300 ease-out
        hover:-translate-y-0.5
        hover:border-[var(--border-2)]
        hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_2px_6px_rgb(0_0_0/0.4),0_18px_42px_-14px_var(--accent-glow)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40
      "
    >
      {/* Slow radial breath behind the card — accent-glow tinted,
          uses the same token as the meadow spotlight so the visual
          language between prompt and target stays connected. */}
      <span
        aria-hidden="true"
        className="eikon-hunt-aura pointer-events-none absolute inset-0 -z-10 rounded-full"
      />

      {/* Flower icon well — same ceramic well treatment as the
          ChannelPill arrow caps so the card reads as part of the
          footer's button family. */}
      <span
        aria-hidden="true"
        className="eikon-hunt-icon-well inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-0)] ring-1 ring-[var(--border-1)] shadow-[inset_0_1px_0_rgb(255_255_255/0.05),inset_0_-1px_0_rgb(0_0_0/0.35)]"
      >
        <span className="eikon-hunt-icon inline-block">
          <FlowerIcon />
        </span>
      </span>

      <span className="text-[14px] font-semibold tracking-tight text-[var(--fg-1)] transition-colors group-hover/hunt:text-[var(--fg-1)]">
        {t('footer.huntTitle')}
      </span>
    </a>
  );
}

/**
 * Compact flower icon — visual rhyme with the larger end-of-meadow
 * Flower component, so once the visitor finds the real bloom they
 * recognise it as the same object the card invited them to look for.
 */
function FlowerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <g transform="translate(12 12)">
        <ellipse
          cx="0"
          cy="-4.6"
          rx="2.4"
          ry="3.4"
          fill="hsl(338 62% 68%)"
        />
        <ellipse
          cx="4.2"
          cy="-1.4"
          rx="2.4"
          ry="3.4"
          fill="hsl(338 62% 68%)"
          transform="rotate(72 4.2 -1.4)"
        />
        <ellipse
          cx="2.6"
          cy="3.6"
          rx="2.4"
          ry="3.4"
          fill="hsl(338 62% 68%)"
          transform="rotate(144 2.6 3.6)"
        />
        <ellipse
          cx="-2.6"
          cy="3.6"
          rx="2.4"
          ry="3.4"
          fill="hsl(338 62% 68%)"
          transform="rotate(216 -2.6 3.6)"
        />
        <ellipse
          cx="-4.2"
          cy="-1.4"
          rx="2.4"
          ry="3.4"
          fill="hsl(338 62% 68%)"
          transform="rotate(288 -4.2 -1.4)"
        />
        <circle cx="0" cy="0" r="1.9" fill="hsl(48 82% 62%)" />
      </g>
    </svg>
  );
}
