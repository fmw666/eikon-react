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
 *   │ [primary CTA] [github CTA]                         ⌥ find it │
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
 * Background:
 *
 *   A single faint grid pattern (CSS repeating-linear-gradient, no
 *   extra asset) anchored to the top-left and masked with a radial
 *   gradient so it only registers as a backdrop behind the slogan
 *   and dissolves to nothing before reaching the CTAs or the right
 *   side. We deliberately dropped the previous aurora-wash + mouse-
 *   spotlight stack: a quieter hero reads as more "editorial" and
 *   stops the visitor's eye competing between three pulsing layers.
 */

import type { CSSProperties } from 'react';

import { CtaButton } from '../components/CtaButton';
import { isGithubConfigured, SITE } from '../site-config';
import { useI18n } from '../theme/i18n';

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
      {/* Top-left grid backdrop — the only decoration left in the
          hero. A small, tightly-masked patch of 40px grid lines
          tucked behind the badge / first line of the title, fading
          to nothing well before it reaches the rest of the text.
          Acts as a "kerning mark" — present enough to give the eye
          something to anchor on, gone before it competes with the
          slogan.

          `eikon-grid-drift` adds a slow background-position drift
          along the diagonal — the grid never reads as moving on a
          quick glance, but on any pause >2s the visitor's eye
          catches the lines crawling. Adds "alive" without painting
          the hero in extra colour or motion. */}
      <div
        aria-hidden="true"
        className="eikon-grid-drift pointer-events-none absolute inset-0 -z-10 opacity-[0.55] dark:opacity-[0.35]"
        style={
          {
            backgroundImage:
              'linear-gradient(to right, var(--border-1) 1px, transparent 1px), linear-gradient(to bottom, var(--border-1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage:
              'radial-gradient(ellipse 18% 26% at 8% 18%, black 15%, transparent 60%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 18% 26% at 8% 18%, black 15%, transparent 60%)',
            '--eikon-grid-step': '40px',
          } as CSSProperties
        }
      />

      {/* Content — single left-aligned text column with a free-floating
          terminal teaser anchored to the bottom-right corner on lg+.
          We deliberately do NOT use a flex row here: a flex sibling
          on the right would compete for horizontal space and shrink
          the text column, capping the title below its `max-w-4xl`.
          Instead, the terminal teaser is positioned *absolutely*
          (out of flow) so the title can claim its natural width and
          spill all the way across the content area without ever
          being squeezed by the teaser. The teaser's `lg:bottom-20`
          + `lg:right-6` align it exactly with the bottom-right inner
          corner of the wrapper's padding box. */}
      {/*
        VERTICAL RHYTHM
        - `pt`: there's a ~80px tall floating Nav pill above this
          section, and Hero is the *first* block the visitor sees.
          `pt-24` (96px) on mobile gives the badge enough breathing
          room from the pill so the page reads as "Nav | gap |
          Hero" rather than "Nav-Hero" smashed together. Scales up
          on `sm` / `lg` along with the title's clamp.
        - `pb`: matched against PlatformPicker's `pt` below, so the
          seam reads as a single deliberate gap (~144-176px combined
          on mobile/sm, growing to ~256px on lg).
      */}
      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-24 sm:px-6 sm:pb-32 sm:pt-28 lg:pb-40 lg:pt-32">
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
              <span className="bg-gradient-to-br from-brand-400 to-brand-700 bg-clip-text text-transparent dark:from-brand-300 dark:to-brand-500">
                {t('hero.title.highlight')}
              </span>
              {t('hero.title.line2Suffix')}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-2xl text-balance text-base leading-relaxed text-[var(--fg-3)] sm:text-lg">
            {t('hero.subtitle')}
          </p>

          {/* CTAs — codex.io-flavoured pair: lime primary with
              sparkle + halo, dark secondary with subtle outline.
              Both inherit the word-reveal hover from <CtaButton/>.
              The extra `mt-12` (vs the original `mt-10`) buys the
              primary's outer halo a bit of breathing room so it
              doesn't crowd the subtitle. */}
          <div className="mt-12 flex flex-wrap items-center justify-start gap-x-5 gap-y-4">
            <CtaButton variant="primary" onClick={onPrimaryCta}>
              {t('hero.cta.primary')}
            </CtaButton>
            {/* Drop the secondary GitHub CTA when site-config has no
                real repo configured — the destination would be a 404
                or the github.com home page, neither of which serves
                the visitor. */}
            {isGithubConfigured() && (
              <CtaButton
                variant="secondary"
                href={SITE.github.url}
                target="_blank"
                rel="noreferrer"
                leadingIcon={<GithubIcon className="h-3.5 w-3.5" />}
              >
                {t('hero.cta.secondary')}
              </CtaButton>
            )}
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
        <div className="mt-12 flex flex-wrap items-stretch gap-3 lg:absolute lg:bottom-40 lg:right-6 lg:mt-0 lg:flex-col lg:flex-nowrap lg:items-end">
          <TerminalCard command="npx create-eikon-react ." />
          {/* "find it" pill — direct deep-link into the GitHub repo.
              The narrative is "want to actually find it? go read the
              source". Unlike the secondary CTA above (which hides
              itself when the repo isn't configured), this pill is a
              load-bearing piece of the Hero's bottom-right visual
              anchor — hiding it would leave the corner feeling empty
              and break the terminal/pill vertical pairing. So we
              always render it; `SITE.github.url` already falls back
              to `https://github.com` when owner/repo aren't filled
              in (see site-config), which is the right behaviour for
              a placeholder template: clicking still goes *somewhere*
              reasonable until the user wires their real repo. */}
          <a
            href={SITE.github.url}
            target="_blank"
            rel="noreferrer"
            className="eikon-shimmer-hover group inline-flex items-center gap-2 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)]/80 px-4 py-3 text-sm text-[var(--fg-2)] no-underline backdrop-blur transition hover:border-brand-500/40 hover:bg-[var(--surface-2)] hover:text-[var(--fg-1)]"
            aria-label={t('hero.findIt')}
          >
            <GithubIcon className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5" />
            <span className="font-mono">{t('hero.findIt')}</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function GithubIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.16c-3.2.69-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.71 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.9-.39.99 0 1.98.13 2.9.39 2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.77.11 3.06.74.8 1.19 1.83 1.19 3.09 0 4.43-2.7 5.41-5.27 5.7.41.36.78 1.06.78 2.14v3.18c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

/**
 * Decorative terminal card used by the Hero's bottom-right teaser.
 *
 * Visual structure (left → right inside the card):
 *
 *   ●●●            ← macOS traffic-light dots (red/yellow/green),
 *                    purely aesthetic; we use the canonical macOS hex
 *                    values rather than theme tokens because the dots
 *                    should read as "this is a terminal" regardless of
 *                    light/dark mode.
 *   $ <command>    ← prompt sigil in brand slate + the actual
 *                    command in the standard mono token, no syntax
 *                    highlighting (a single `npx` line doesn't need it
 *                    and any colour beyond the sigil would compete
 *                    with the gradient title above).
 *   │              ← slim cursor bar with a macOS-Terminal-style
 *                    blink: stays fully visible, fades out for a
 *                    beat, hides briefly, then *snaps* back in. The
 *                    snap-on (not the fade-off) is the eye-catching
 *                    moment, which is what makes the teaser read as
 *                    a real prompt waiting for input.
 *
 * The card itself is just a rounded surface with the same
 * border/blur stack the rest of the landing uses, so it slots into
 * either theme without an extra branch.
 */
function TerminalCard({ command }: { command: string }) {
  return (
    <div
      // `max-w-full` + the inner `min-w-0` + `truncate` on the code
      // line keep the card from forcing a horizontal scroll on
      // viewports narrower than the command's natural width
      // (320-340px iPhones with the `npx create-eikon-react .`
      // string render OK without it but any longer command would
      // overflow).
      className="eikon-shimmer-hover flex max-w-full items-center gap-2.5 rounded-xl border border-[var(--border-1)] bg-[var(--surface-2)]/85 px-3 py-2.5 shadow-lg shadow-black/5 backdrop-blur dark:shadow-black/40 sm:gap-3 sm:px-4 sm:py-3"
      role="img"
      aria-label={`Terminal: ${command}`}
    >
      <div className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      </div>
      <code className="whitespace-nowrap font-mono text-xs text-[var(--fg-2)] sm:text-sm">
        <span className="text-brand-500">$ </span>
        {command}
        {/* Trailing slim cursor — `eikon-cursor-blink` mimics the
            native macOS Terminal.app cadence: fully visible by
            default, fades out for one short beat, sits hidden for
            a noticeable pause, then *snaps* back in (no fade-in).
            The snap-on is the moment that sells "this is a real
            prompt waiting for input". Geometry: `w-[0.18em]` makes
            it a thin vertical bar (~1.5–2px at the surrounding
            text size) instead of a wide block — closer to modern
            line-cursors and less visually heavy next to the mono
            command. We bump the colour from --fg-3 up to --fg-2
            so the now-thinner bar still reads clearly against the
            terminal surface. */}
        <span
          aria-hidden="true"
          className="eikon-cursor-blink ml-0.5 inline-block h-[1em] w-[0.18em] translate-y-[2px] bg-[var(--fg-2)]"
        />
      </code>
    </div>
  );
}

