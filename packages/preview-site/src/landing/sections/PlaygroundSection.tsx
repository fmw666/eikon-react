/**
 * @file PlaygroundSection.tsx
 * @description Landing wrapper for the three-pane playground —
 * intentionally the *visual focal point* of the entire home page.
 *
 * Hierarchy on the page:
 *
 *   Hero               (introduce the product, hand off downward)
 *   PlatformPicker     (supporting: pick a target, quiet flat cards)
 *   PlaygroundSection  ← THE HERO. Live tool. Biggest heading.
 *                        Surrounded by an ambient halo and a
 *                        visible accent frame. The whole layout
 *                        funnels here.
 *   PromptOutput       (supporting: copy-ready output of the above)
 *   …story content
 *
 * Why so loud (relative to its neighbours):
 *
 *   The visitor came to *try* the template, not read about it. The
 *   playground frame is where that promise gets delivered. Every
 *   other surface on this page is intentionally dialled down so the
 *   eye lands here without competition: PlatformPicker dropped its
 *   3D + animated borders, PainPoints lost its mouse spotlight, the
 *   QASection's "live rail" is just a thin border now. The energy
 *   they used to spend on attention-grabbing decoration is
 *   concentrated into this one section instead — the LIVE eyebrow,
 *   the bigger heading, the ambient halo, the accented frame ring.
 *
 * Owns:
 *
 *   - LIVE eyebrow with pulsing dot (telegraphs "this is a real,
 *     working tool — try it now").
 *   - Large section heading + subtitle.
 *   - The params card (driven by `ParamsPanel`).
 *   - The playground frame (Toolbar + Files + Code + Preview),
 *     wrapped in a brand-tinted accent container with a soft radial
 *     halo behind it.
 */

import { ParamsPanel } from '@/shell/ParamsPanel';
import { PlaygroundShell } from '@/shell/App';

import { useI18n } from '../theme/i18n';

/** Anchor used by the Hero CTA and by Nav's #playground link. */
export const PLAYGROUND_ANCHOR_ID = 'playground';

export function PlaygroundSection() {
  const { t } = useI18n();
  return (
    <section
      id={PLAYGROUND_ANCHOR_ID}
      className="relative isolate mx-auto w-full max-w-7xl px-6 py-24 sm:py-32"
      aria-labelledby="playground-title"
    >
      {/* Ambient halo — a single soft radial wash sitting *behind*
          the section's content. It widens around the frame so the
          playground reads as "lit from behind", visually separating
          it from the calmer cards above and below. The alpha is
          intentionally low so on a quick scroll-by the section
          reads as "the page suddenly has a centre of mass" rather
          than as a coloured rectangle.

          `eikon-aurora-drift` is a 12s ease-in-out translate cycle
          that nudges the halo a few % up/down/left/right; on a
          static screenshot the section reads the same, on a real
          page the centre of mass slowly breathes. */}
      <div
        aria-hidden="true"
        className="eikon-aurora-drift pointer-events-none absolute inset-x-0 top-12 -z-0 mx-auto h-[640px] max-w-5xl"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 40%, rgba(148, 163, 184, 0.10), transparent 70%)',
          filter: 'blur(8px)',
          animation: 'eikon-aurora-drift 12s ease-in-out infinite',
        }}
      />

      {/* Drifting dot grid — sits behind the halo. The
          `eikon-grid-drift` class slowly translates the tiled dot
          pattern along the diagonal so the background reads as
          "alive but not loud" when the visitor pauses to look. We
          fade it out near the top/bottom of the section with a
          mask gradient so the grid never crashes into the
          neighbouring section boundaries. */}
      <div
        aria-hidden="true"
        className="eikon-grid-drift pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(rgba(148,163,184,0.10) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
        }}
      />

      <div className="relative">
        {/* ---- Editorial heading ------------------------------------
            This is the loudest title on the page on purpose. Bigger
            than PlatformPicker above (text-2xl/3xl) and heavier than
            PromptOutput below. The LIVE eyebrow with its pulsing
            dot reinforces "real working tool" — pairs with the
            breathing playground frame underneath. */}
        <div className="mb-10 text-center sm:mb-12">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-300">
            <span className="eikon-pulse-glow inline-block h-1.5 w-1.5 rounded-full bg-brand-300 shadow-[0_0_8px_var(--accent-glow)]" />
            {t('playground.eyebrow')}
          </p>
          <h2
            id="playground-title"
            className="text-4xl font-semibold tracking-tight text-[var(--fg-1)] sm:text-5xl"
          >
            {t('params.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-[var(--fg-3)] sm:text-base">
            {t('params.subtitle')}
          </p>
        </div>

        <ParamsPanel />

        {/* Playground frame container.

            The visible chrome is THE signature animation of the
            home page: `eikon-conic-border` paints a 1px conic
            gradient ring around the perimeter that rotates once
            every 12 seconds, so the focal section has a quiet
            "this is alive" pulse even when the visitor isn't
            interacting. We layer a soft slate glow shadow
            underneath for depth. The inner content is the
            resizable three-pane shell at a fixed 700px tall —
            enough vertical room for a full Toolbar + a healthy
            device preview on a 13" laptop without crowding the
            viewport.

            Why 12s and not faster:
              - <8s reads as "frantic" and competes with the
                playground content for attention.
              - >15s reads as "broken / not animating".
              - 12s lands at exactly the speed where the rotation
                is visible on a slow scroll-pause but invisible
                while the visitor is actively typing/clicking.
        */}
        <div
          className="eikon-conic-border relative mt-8 rounded-2xl shadow-[0_24px_80px_-32px_rgb(0_0_0/0.55),0_0_0_1px_rgb(148_163_184/0.06)]"
          style={{ height: 700 }}
        >
          <div className="h-full overflow-hidden rounded-2xl">
            <PlaygroundShell />
          </div>
        </div>
      </div>
    </section>
  );
}
