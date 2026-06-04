/**
 * @file Hero.tsx
 * @description Landing hero with a single left-aligned text column
 * and a free-floating terminal teaser anchored to the bottom-right.
 *
 * Layout (lg+):
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ ┄┄┄┄┄┄                                                        │
 *   │ ┄┄┄┄┄┄  badge                                                 │
 *   │ ┄┄┄┄┄┄  title (line 1, plain)                                 │
 *   │ ┄┄┄┄┄┄  title (line 2, gradient highlight on the key phrase)  │
 *   │         subtitle                                              │
 *   │                                                               │
 *   │                                         ●●● $ npx create-…  ▎ │
 *   │ [primary CTA]                                      ⌥ find it │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * The terminal teaser is absolutely positioned so it never competes
 * with the text column for horizontal space — the title is free to
 * use its full `max-w-4xl`, even if that means visually crossing
 * "under" the teaser on intermediate widths. The teaser itself
 * stacks vertically on lg+ (terminal on top, "find it" beneath,
 * both right-aligned), and collapses to a horizontal row in flow
 * below the CTAs on <lg.
 *
 * Decorative pieces (the grid/webicon backdrop, the replayable
 * terminal card, the bottom-right "find it" pill, the GitHub glyph)
 * live in sibling `./hero/*` modules — they're private to the hero
 * and intentionally not re-exported from any feature barrel.
 */

import { CtaButton } from '../components/CtaButton';
import { useI18n } from '../theme/i18n';
import { FindItPill } from './hero/FindItPill';
import { HeroBackdrop } from './hero/HeroBackdrop';
import { TerminalCard } from './hero/TerminalCard';

/** Anchor id used by Nav's "Home" link to scroll back to the top. */
export const HERO_ANCHOR_ID = 'top';

export function Hero({
  onPrimaryCta,
}: {
  /** Click handler for the primary "go find it" CTA — scrolls to the
   *  platform picker. Wired by LandingPage so the Hero stays presentational. */
  onPrimaryCta: () => void;
}) {
  const { t } = useI18n();

  return (
    <section
      id={HERO_ANCHOR_ID}
      className="relative isolate overflow-hidden"
    >
      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-32 sm:pt-28 lg:pb-40 lg:pt-32">
        <HeroBackdrop />
        {/* Text column */}
        <div className="flex flex-col items-start text-left">
          {/* Badge */}
          <a
            href="#playground"
            className="group inline-flex items-center gap-2 rounded-full border border-[var(--border-1)] bg-[var(--surface-1)]/80 px-3 py-1 text-xs text-[var(--fg-3)] no-underline backdrop-blur transition hover:border-brand-500/40 hover:text-[var(--fg-1)]"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500 shadow-[0_0_12px_var(--accent-glow)]" />
            <span className="font-mono">{t('hero.badge')}</span>
            <span aria-hidden="true" className="text-[var(--fg-4)] transition group-hover:translate-x-0.5">
              →
            </span>
          </a>

          {/* Title — two-line layout: the first line ends at the
              comma (zh) / after the subject (en), the second line
              carries the gradient-highlighted key phrase ("同一段
              Prompt" / "the same prompt"). The break is hard-coded
              via two block spans rather than relying on
              `text-balance`, because we want the comma to be the
              line boundary in every viewport — that's the whole
              point of the editorial left-aligned look. */}
          <h1 className="mt-7 max-w-4xl text-[clamp(2rem,8.5vw,2.5rem)] font-semibold leading-[1.12] tracking-tight text-[var(--fg-1)] sm:mt-8 sm:text-[clamp(2.75rem,6vw,3.75rem)] lg:text-6xl">
            <span className="block">{t('hero.title.line1')}</span>
            <span className="mt-2 block">
              {t('hero.title.line2Prefix')}
              <span className="bg-gradient-to-br from-[hsl(45_90%_76%)] via-[hsl(42_88%_71%)] to-[hsl(38_72%_60%)] bg-clip-text text-transparent drop-shadow-[0_0_12px_rgb(247_205_141/0.08)]">
                {t('hero.title.highlight')}
              </span>
              {t('hero.title.line2Suffix')}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-2xl text-balance text-base leading-relaxed text-[var(--fg-3)] sm:text-lg">
            {t('hero.subtitle')}
          </p>

          {/* CTA — single primary button. The Nav already carries a
              GitHub link and the bottom-right "find it" pill below
              also deep-links to the repo, so a secondary GitHub CTA
              here is redundant. */}
          <div className="mt-12 flex flex-wrap items-center justify-start gap-x-5 gap-y-4">
            <CtaButton variant="primary" onClick={onPrimaryCta}>
              {t('hero.cta.primary')}
            </CtaButton>
          </div>
        </div>

        {/* Terminal teaser — two pieces, layout switches by viewport:
              · <lg (mobile / tablet): horizontal row, terminal on the
                left, "find it" pill on the right, both sitting in
                flow below the CTAs (mt-12).
              · lg+ (desktop): absolutely-pinned to the bottom-right
                corner of the hero, *vertically* stacked — terminal
                on top, "find it" pill directly beneath it, both
                right-aligned via `lg:items-end`.

            We use `flex-wrap` on the mobile row so the pill can
            gracefully drop below the terminal on extra-narrow
            screens (≤320px) where the two side-by-side would
            otherwise overflow. */}
        <div className="mt-10 flex flex-wrap items-end gap-2.5 sm:mt-12 sm:gap-3 lg:absolute lg:bottom-40 lg:right-6 lg:mt-0 lg:flex-col lg:flex-nowrap lg:items-end">
          <TerminalCard command="npx create-eikon-react ." />
          <FindItPill />
        </div>
      </div>
    </section>
  );
}
