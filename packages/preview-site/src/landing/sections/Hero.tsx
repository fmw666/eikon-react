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

import { useState, type CSSProperties } from 'react';

import { CtaButton, WordReveal } from '../components/CtaButton';
import { SITE } from '../site-config';
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
      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-32 sm:pt-28 lg:pb-40 lg:pt-32">
        {/* Grid backdrop — anchored to the content container so its
            mask coordinates align with the text's left edge. */}
        <div
          aria-hidden="true"
          className="eikon-grid-drift pointer-events-none absolute -left-16 inset-y-0 right-0 -z-10"
          style={
            {
              backgroundImage: `
                radial-gradient(circle 1.5px at center, var(--border-2) 0%, transparent 100%),
                linear-gradient(to right, var(--border-2) 1px, transparent 1px),
                linear-gradient(to bottom, var(--border-2) 1px, transparent 1px)
              `.trim(),
              backgroundSize: '48px 48px',
              maskImage:
                'radial-gradient(ellipse 45% 60% at 5% 45%, black 15%, transparent 65%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 45% 60% at 5% 45%, black 15%, transparent 65%)',
              opacity: 0.6,
              '--eikon-grid-step': '40px',
            } as CSSProperties
          }
        />
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
        <div className="mt-10 flex flex-wrap items-stretch gap-2.5 sm:mt-12 sm:gap-3 lg:absolute lg:bottom-40 lg:right-6 lg:mt-0 lg:flex-col lg:flex-nowrap lg:items-end">
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
            className="
              eikon-shimmer-hover group inline-flex items-center gap-2.5
              rounded-full border border-[var(--border-1)]
              bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface-1)]
              py-2 pl-3 pr-2
              text-sm text-[var(--fg-2)] no-underline
              shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_1px_3px_rgb(0_0_0/0.25)]
              transition-all duration-200 ease-out
              hover:-translate-y-0.5
              hover:border-[var(--border-2)]
              hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.10),0_3px_8px_rgb(0_0_0/0.35)]
              hover:text-[var(--fg-1)]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40
            "
            aria-label={t('hero.findIt')}
          >
            <span className="font-mono text-xs tracking-tight">
              <WordReveal>{t('hero.findIt')}</WordReveal>
            </span>
            <span
              aria-hidden="true"
              className="
                inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full
                bg-[var(--surface-0)] text-[var(--fg-2)]
                shadow-[inset_0_1px_0_rgb(255_255_255/0.04),inset_0_-1px_0_rgb(0_0_0/0.35)]
                transition-transform duration-200 ease-out
                group-hover:translate-x-0.5 group-hover:text-[var(--fg-1)]
              "
            >
              <GithubIcon className="h-3 w-3" />
            </span>
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
const TERMINAL_INSTALL_STEPS = [
  { kind: 'installing', text: 'Installing packages...', delay: '2.55s' },
  { kind: 'package', text: 'react@19.0.0', delay: '4.3s' },
  { kind: 'package', text: 'vite@6.0.0', delay: '5s' },
  { kind: 'package', text: '@eikon/core@1.0.0', delay: '5.7s' },
  { kind: 'success', text: 'Project created successfully!', delay: '6.65s' },
] as const;

function TerminalCard({ command }: { command: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [runKey, setRunKey] = useState(0);

  const replayInstallDemo = () => {
    setIsExpanded(true);
    setRunKey((current) => current + 1);
  };

  return (
    <button
      // `max-w-full` + the inner `min-w-0` + `truncate` on the code
      // line keep the card from forcing a horizontal scroll on
      // viewports narrower than the command's natural width
      // (320-340px iPhones with the `npx create-eikon-react .`
      // string render OK without it but any longer command would
      // overflow).
      type="button"
      className={[
        'eikon-shimmer-hover eikon-terminal-demo max-w-full rounded-xl border border-[var(--border-1)] bg-[var(--surface-2)]/85 px-3 py-2.5 text-left shadow-lg shadow-black/5 backdrop-blur transition-colors hover:border-[var(--border-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40 dark:shadow-black/40 sm:px-4 sm:py-3',
        isExpanded ? 'is-expanded' : '',
      ].join(' ')}
      aria-label={`Run terminal install demo: ${command}`}
      aria-expanded={isExpanded}
      onClick={replayInstallDemo}
      onBlur={() => setIsExpanded(false)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <div className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <code
          className="min-w-0 whitespace-nowrap font-mono text-xs text-[var(--fg-2)] sm:text-sm"
          style={{ '--eikon-terminal-command-chars': command.length } as CSSProperties}
        >
          <span className="text-brand-500">$ </span>
          <span
            key={isExpanded ? runKey : 'idle'}
            className={isExpanded ? 'eikon-terminal-typewriter' : undefined}
          >
            {command}
          </span>
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

      <div
        key={runKey}
        className="eikon-terminal-log mt-4 space-y-2 pl-7 font-mono text-xs sm:text-sm"
        aria-hidden={!isExpanded}
      >
        {TERMINAL_INSTALL_STEPS.map((step) => (
          <div
            key={step.text}
            className="eikon-terminal-log-line flex items-center gap-2.5"
            style={{ '--eikon-terminal-line-delay': step.delay } as CSSProperties}
          >
            {step.kind === 'installing' ? (
              <>
                <span className="relative inline-flex w-[1.6em] items-center" aria-hidden="true">
                  <span className="eikon-terminal-spinner absolute left-0" />
                  <span className="eikon-terminal-install-done absolute left-0 text-[#8f949e]">
                    ok
                  </span>
                </span>
                <span className="text-[#62a8ff]">{step.text}</span>
              </>
            ) : step.kind === 'success' ? (
              <>
                <span aria-hidden="true" className="text-[#ffbd5b]">
                  *
                </span>
                <span className="font-semibold text-[#b6ff5b]">{step.text}</span>
              </>
            ) : (
              <>
                <span aria-hidden="true" className="text-[#8f949e]">
                  ok
                </span>
                <span className="text-[var(--fg-3)]">{step.text}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </button>
  );
}

