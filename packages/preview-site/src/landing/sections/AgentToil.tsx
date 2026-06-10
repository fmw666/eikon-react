/**
 * @file AgentToil.tsx
 * @description The "stop paying for bad architecture, one «请继续» at a time"
 * section — the cost beat in the story half of the page.
 *
 * Staged as its own FULL-BLEED BAND so it stops reading as a third cramped
 * box between two text-dense neighbours (PainPoints above, Philosophy below).
 * The band gives the section its own ground and its own generous rhythm:
 *
 *   ┌══════════ full-bleed tinted band (edge-to-edge) ══════════════════┐
 *   │  · masked drifting grid + a right-biased brand halo behind the    │
 *   │    proof column · hairline seams top & bottom ·                   │
 *   │   ┌─ max-w-7xl centred content ───────────────────────────────┐  │
 *   │   │ eyebrow                                                    │  │
 *   │   │ headline            ┌───────────────────────────────────┐ │  │
 *   │   │ the pain            │  agent chat mock — floating on a   │ │  │
 *   │   │ ┏ author's note ┓   │  deep shadow with a subtle 3D tilt │ │  │
 *   │   │ ┃ + the kicker  ┃   └───────────────────────────────────┘ │  │
 *   │   └────────────────────────────────────────────────────────────┘  │
 *   └═══════════════════════════════════════════════════════════════════┘
 *
 * Design notes:
 *   - The band is the OUTER, static, full-bleed div. It is deliberately NOT
 *     wrapped in a <Reveal> (LandingPage renders <AgentToil/> bare): the
 *     reveal transforms — `eikon-reveal-zoom` is `scale(0.9)` — would pull a
 *     full-bleed band in from the viewport edges while it animates. Instead
 *     the band sits still and only the CENTRED content reveals (safe to
 *     scale, it has side margins).
 *   - All decorative layers are aria-hidden, pointer-events-none, `-z-10`
 *     children of the band, and the band is `overflow-hidden` so they stay
 *     inside it. `content-visibility:auto` stays on the INNER <section> only,
 *     so the always-rendered band paints its tinted ground before the
 *     content streams in.
 *   - The chat mock floats: a subtle 3D tilt + a deep black drop shadow (no
 *     glow) via `eikon-toil-float`, applied on a WRAPPER so `AgentChatReplay`
 *     (the animation/loop) is never touched.
 *   - Grid is 4/8 (not 5/7): the prose column doesn't want width, the
 *     animated mock does. Mask/glow are biased to ~72% x so the left
 *     argument column stays on near-clean surface (protects --fg-3 contrast
 *     in dark mode).
 */

import { useRef, type CSSProperties, type ReactNode } from 'react';

import { Reveal } from '../components/Reveal';
import { useI18n } from '../theme/i18n';
import { AgentChatReplay } from './agent-toil/AgentChatReplay';
import { useInView } from './agent-toil/use-in-view';

/** Anchor id so future nav/deep-links can target this section. */
export const AGENT_TOIL_ANCHOR_ID = 'why-it-matters';

/**
 * Drifting dot/line grid behind the band — same recipe as the Hero backdrop,
 * tuned to a clean 40px tile so the drift re-aligns on a tile boundary, and
 * masked + right-biased so it fades out before the edges and the left column.
 */
const GRID_BACKDROP_STYLE = {
  backgroundImage: [
    'radial-gradient(circle 1.5px at center, var(--border-1) 0%, transparent 100%)',
    'linear-gradient(to right, var(--border-1) 1px, transparent 1px)',
    'linear-gradient(to bottom, var(--border-1) 1px, transparent 1px)',
  ].join(', '),
  backgroundSize: '40px 40px',
  maskImage: 'radial-gradient(ellipse 80% 70% at 72% 50%, #000 15%, transparent 65%)',
  WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 72% 50%, #000 15%, transparent 65%)',
  opacity: 0.5,
  '--eikon-grid-step': '40px',
} as CSSProperties;

/** Soft brand halo pooled behind the proof column (biased right). */
const HALO_STYLE: CSSProperties = {
  background: 'radial-gradient(60% 55% at 72% 45%, var(--accent-glow), transparent 70%)',
};

const SEAM = 'linear-gradient(90deg, transparent, var(--border-1), transparent)';

export function AgentToil() {
  const { lang, t } = useI18n();

  // Gate the replay loop on the panel's UNTRANSFORMED container — observing
  // the panel itself fails because it lives inside the 3D float tilt and
  // IntersectionObserver never fires for 3D-transformed targets (see
  // use-in-view.ts). We observe here and pass the signal into the replay.
  const proofRef = useRef<HTMLDivElement>(null);
  const proofInView = useInView(proofRef);

  // The headline's single chromatic moment: the pain-phrase 「请继续」 /
  // "please continue" gets a slate gradient-shimmer + marker underline. We
  // split the FROZEN title string around the literal phrase (per locale), with
  // a plain-string fallback so a future copy edit can never crash the render.
  const title = t('toil.title');
  const phrase = lang === 'zh' ? '「请继续」' : '"please continue"';
  const pIdx = title.indexOf(phrase);
  const titleNode =
    pIdx < 0 ? (
      title
    ) : (
      <>
        {title.slice(0, pIdx)}
        <EmphPhrase>{phrase}</EmphPhrase>
        {title.slice(pIdx + phrase.length)}
      </>
    );

  return (
    <div className="relative w-full overflow-hidden">
      {/* ── Decorative band layers (static, behind the content) ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[var(--surface-1)]"
      />
      <div
        aria-hidden="true"
        className="eikon-grid-drift pointer-events-none absolute inset-0 -z-10"
        style={GRID_BACKDROP_STYLE}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={HALO_STYLE}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px"
        style={{ background: SEAM }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-px"
        style={{ background: SEAM }}
      />

      {/* ── Centred content. content-visibility lives here, not on the band,
            so the band's tinted ground paints before the content streams in. ── */}
      <section
        id={AGENT_TOIL_ANCHOR_ID}
        className="mx-auto w-full max-w-[90rem] px-4 py-24 sm:px-6 sm:py-28 lg:py-36"
        aria-labelledby="toil-title"
        style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 760px' }}
      >
        <Reveal variant="zoom">
          {/* 2-track grid (not grid-cols-12): one gutter, so a large gap
              stays safe at every width — a 12-col grid's 11 internal gutters
              would overrun the row near the lg breakpoint. */}
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16 xl:gap-24">
            {/* ── Left: the argument, as one crafted editorial column ── */}
            <div className="mx-auto min-w-0 max-w-[34rem] lg:max-w-none">
              {/* Eyebrow — a horizontal lead-tick that rhymes with the coda's
                  left-rule, threading one slate spine down the column. */}
              <p className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--fg-4)]">
                <span
                  aria-hidden="true"
                  className="h-px w-3 rounded-full bg-brand-500 shadow-[0_0_8px_var(--accent-glow)]"
                />
                {t('toil.eyebrow')}
              </p>

              <h2
                id="toil-title"
                className="mt-5 text-balance text-[length:clamp(1.5rem,1.4rem+0.55vw,1.8rem)] font-semibold leading-[1.34] tracking-[-0.015em] text-[var(--fg-1)]"
              >
                {titleNode}
              </h2>

              <p className="mt-7 max-w-[42ch] text-pretty text-[15px] leading-[1.7] text-[var(--fg-3)] sm:text-[15.5px]">
                {t('toil.lead')}
              </p>

              {/* The author's coda — de-carded into a slate left-rule that
                  continues the eyebrow tick (one unbroken spine). A big chasm
                  marks the "now the author speaks" pivot; on mobile the coda
                  gains its own half-step ground so it visibly separates the
                  moment it has full width, staying airy/open on desktop. */}
              {/* container-type makes the figure a query container so the
                  kicker can size itself with cqi units and always fit on ONE
                  line (in both languages) however wide the column is. */}
              <figure className="mt-14 [container-type:inline-size] rounded-r-lg border-l-2 border-brand-500/35 bg-[var(--surface-0)] px-4 py-4 sm:mt-12 sm:px-5 lg:bg-transparent lg:py-0 lg:pr-0">
                <figcaption className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
                  — {t('toil.plea.label')}
                </figcaption>
                <blockquote className="max-w-[42ch] text-pretty text-[15px] leading-[1.65] text-[var(--fg-2)]">
                  {t('toil.plea.body')}
                </blockquote>
                {/* The closing crescendo — forced onto a single line by scaling
                    its font to the container width (cqi), capped so it never
                    gets oversized; nowrap is the hard one-line guarantee. */}
                <p className="mt-3.5 whitespace-nowrap text-[length:min(4.5cqi,1.375rem)] font-semibold leading-snug tracking-[-0.01em] text-[var(--fg-1)]">
                  {t('toil.plea.kicker')}
                </p>
              </figure>
            </div>

            {/* ── Right: the proof (looping agent chat, floating on a deep
                shadow + cool backlight bloom, with a subtle 3D tilt) ── */}
            <div className="min-w-0">
              {/* ref here (NOT on the 3D-tilted child) so the visibility
                  observer that drives the replay loop actually fires. */}
              <div ref={proofRef} className="relative isolate">
                {/* Backlight bloom — painted behind the panel so the dark
                    device pops against a lit halo on the dark band. */}
                <div
                  aria-hidden="true"
                  className="eikon-toil-backlight pointer-events-none absolute -inset-x-8 -bottom-6 -top-10"
                />
                <div className="eikon-toil-float rounded-2xl">
                  <AgentChatReplay inView={proofInView} />
                </div>
              </div>
              <p className="mt-5 text-center text-[13px] leading-relaxed text-[var(--fg-4)]">
                {t('toil.caption')}
              </p>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

/**
 * The headline's single chromatic moment: the pain-phrase 「请继续」 /
 * "please continue" in a slate brand gradient that slowly shimmers (reusing
 * the eikon-text-shimmer keyframe via bg-clip:text, the same recipe as the
 * QuoteStrip) with a faint slate marker-underline behind the glyphs. The
 * gradient is mid-lightness (brand-500 ↔ brand-300) so it stays legible on
 * BOTH the light and dark band. The span is `isolate` so the underline pseudo
 * (-z-10) sits behind the glyphs, not behind the column.
 *
 * `eikon-text-shimmer` has NO built-in reduced-motion guard in this repo, so
 * `motion-reduce:[animation:none]` is load-bearing — it stops the sweep while
 * the (now static) gradient + underline keep the emphasis intact.
 */
function EmphPhrase({ children }: { children: ReactNode }) {
  return (
    <span
      className="relative isolate inline-block whitespace-nowrap bg-clip-text font-semibold text-transparent [animation:eikon-text-shimmer_8s_infinite] after:absolute after:inset-x-[-0.06em] after:bottom-[0.06em] after:-z-10 after:h-[0.14em] after:rounded-[1px] after:bg-brand-500/25 after:content-[''] motion-reduce:[animation:none]"
      style={{
        backgroundImage:
          'linear-gradient(90deg, var(--color-brand-500) 0%, var(--color-brand-300) 22%, var(--color-brand-500) 44%, var(--color-brand-500) 100%)',
        backgroundSize: '250% 100%',
      }}
    >
      {children}
    </span>
  );
}
