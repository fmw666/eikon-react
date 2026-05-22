/**
 * @file PlaygroundSection.tsx
 * @description The home page's interactive workbench — a single
 * focal section that bundles every control the visitor needs
 * (parameters, copyable prompt) alongside the live three-pane
 * playground, so the *complete* "configure → preview → copy" loop
 * is finished without leaving this one viewport.
 *
 * Layout (lg+):
 *
 *   ┌───── ◉ LIVE PLAYGROUND ─────────────────────────────────┐
 *   │ Configure your stack                                      │
 *   │ Every choice updates the preview and the command…         │
 *   ├──────────────────────┬────────────────────────────────────┤
 *   │ Parameters           │                                     │
 *   │  · Design            │                                     │
 *   │  · Layout            │                                     │
 *   │  · UI / Toast        │      PlaygroundShell                │
 *   │  · pm                │      (Files | Code | Preview)       │
 *   │ ─────────────        │                                     │
 *   │ Copy Prompt / CLI    │                                     │
 *   │ ┌──────────────┐     │                                     │
 *   │ │ npx …        │     │                                     │
 *   │ └──────────────┘     │                                     │
 *   └──────────────────────┴────────────────────────────────────┘
 *
 * Below `lg` the two columns stack: the sidebar (params + prompt)
 * sits above a fixed-height frame, so the section degrades to a
 * legible single column on tablet/phone without losing any
 * functionality.
 *
 * Why a single workbench instead of three sibling sections
 * --------------------------------------------------------
 *   The previous home page split this into:
 *     PlatformPicker → PlaygroundSection (params + frame) →
 *     PromptOutput
 *   which forced the visitor to scroll between three loosely-tied
 *   surfaces to see the result of a single configuration choice.
 *   The "click a toggle, scroll down to see the prompt update"
 *   loop was real but felt disconnected — the visitor had to hold
 *   "the panels are wired together" in their head.
 *
 *   Pulling params + frame + prompt into one workbench card makes
 *   that wiring physical: every change happens within one
 *   bordered surface, the visitor's eyes don't leave the box,
 *   and the page itself reads as "the playground is the
 *   destination". PlatformPicker stays upstream as its own
 *   editorial section because it is also the page's
 *   "what does this template ship?" overview — its rich
 *   triple-card layout earns its keep there in a way that
 *   would feel cramped inside this workbench's sidebar.
 *
 * Why we still don't scroll-jack
 * ------------------------------
 *   SuperWhisper-style sticky pinning would make this surface
 *   *trap* the wheel until the visitor "completed" it. But every
 *   sub-region inside the workbench has its own scrollbar (file
 *   tree, code editor, preview iframe, prompt `<pre>`,
 *   sidebar overflow) and the moment any of them needs to scroll,
 *   a hijacked outer wheel collides with the inner one. Instead
 *   we use a tall-but-bounded card (`clamp(640px, 82vh, 880px)`):
 *   the workbench takes most of the viewport so the visitor's
 *   eye naturally rests on it, but the page itself never stops
 *   responding to the wheel — scroll past it the moment you're
 *   done.
 *
 * Owns:
 *   - LIVE eyebrow + heading + subtitle (editorial framing).
 *   - The workbench card with the rotating conic-border ring.
 *   - The two-pane internal layout (sidebar + main).
 *   - Anchors for the two Hero CTAs:
 *       · PLAYGROUND_ANCHOR_ID  — the section as a whole, scrolled
 *                                 to from "Get started" once the
 *                                 platform is chosen.
 *       · PROMPT_OUTPUT_ANCHOR_ID — the sidebar's prompt sub-region,
 *                                   scrolled to from the Hero's
 *                                   "find it" pill.
 */

import { ParamsPanel } from '@/shell/ParamsPanel';
import { PlaygroundShell } from '@/shell/App';

import {
  CollapsibleSidebar,
  SlidersIcon,
  TerminalIcon,
} from '../components/collapsible-sidebar';
import { useI18n } from '../theme/i18n';
import { PromptOutput } from './PromptOutput';

/** Anchor used by the Hero CTA and by Nav's #playground link. */
export const PLAYGROUND_ANCHOR_ID = 'playground';

/**
 * Anchor for the prompt sub-region inside the workbench sidebar.
 * Re-exported here (instead of from `PromptOutput.tsx`) because the
 * canonical location of the prompt block is now this workbench, not
 * the standalone `PromptOutput` section that the home page no
 * longer renders. The Hero's "find it" pill scrolls here.
 */
export const PROMPT_OUTPUT_ANCHOR_ID = 'prompt-output';

export function PlaygroundSection() {
  const { t } = useI18n();
  return (
    <section
      id={PLAYGROUND_ANCHOR_ID}
      // Wide-screen "break out" — the surrounding marketing sections
      // (Hero, PlatformPicker, story half) all live inside `max-w-7xl`
      // (1280px). The workbench is the home page's tool surface, so
      // it deliberately escapes that gutter to read as "the page
      // momentarily expands into work mode". `max-w-[1760px]` is wide
      // enough to fill any laptop / desktop monitor commonly in use,
      // but caps the card so it doesn't sprawl on 4K+ displays where
      // a truly viewport-width card would put the sidebar and the
      // preview *too far apart* for the eye to read them as one
      // tool. Padding tightens at small sizes and grows at the
      // larger breakpoints so the card never crashes into the
      // viewport edge but also never wastes huge wings of negative
      // space on Retina laptops.
      className="relative isolate mx-auto w-full max-w-[1760px] px-4 py-20 sm:px-6 sm:py-24 lg:px-8 xl:px-12"
      aria-labelledby="playground-title"
    >
      {/* Ambient halo — radial slate wash sitting *behind* the
          workbench. Pairs with the conic ring on the card to make
          the whole surface read as "lit from behind", visually
          separating it from the calmer cards above and below. The
          alpha is intentionally low so on a quick scroll-by the
          section reads as "the page suddenly has a centre of
          mass" rather than as a coloured rectangle.

          `eikon-playground-halo` drives a three-act scroll-driven
          bloom synchronised with the workbench card itself: the
          halo opens from `scale(0.72) opacity 0.3` as the section
          enters, peaks at `scale(1.18)` (a deliberate overshoot)
          at 28% view-progress when the card itself "lands", then
          settles to `scale(1.10)` and *holds there* for the rest
          of the section's view-progress — exactly while the
          visitor is using the workbench. Browsers without
          `animation-timeline: view()` paint the halo at its
          default rest state — no broken visuals, no JS fallback. */}
      <div
        aria-hidden="true"
        // Halo width tracks the workbench card itself — when the
        // section breaks out to ~1760px the halo expands with it,
        // so the "lit from behind" wash still hugs the card's
        // shoulders instead of leaving the wide card's outer
        // thirds painted only by the page background.
        className="eikon-playground-halo pointer-events-none absolute inset-x-0 top-12 -z-0 mx-auto h-[680px] max-w-[1640px]"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 40%, rgba(148, 163, 184, 0.12), transparent 70%)',
          filter: 'blur(8px)',
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

      {/* Cinematic stage vignette — third layer of the "push and
          hold" move. Sits *above* the grid and *below* the halo +
          workbench, so it darkens the section's background paint
          (grid, page surface) without ever touching the workbench
          card or its halo high-light. Fades in from `opacity 0` to
          ~0.72 across the same Act I → III timeline as the frame's
          dolly: by the time the visitor is in the HOLD stretch
          using the workbench, the surrounding section is dimmed
          and the workbench is the only visually loud thing on
          screen — a stage spotlight effect.

          The vignette is contained to this section's box; once
          the visitor scrolls past, neighbouring surfaces paint at
          full brightness immediately. We don't try to dim the
          whole viewport (would require a `position: fixed`
          overlay coordinated across sections, and would leak past
          this section's responsibility).
            
          On reduced-motion: the keyframe is disabled and opacity
          forced to 0, so the section just paints its normal
          background — the spotlight effect is an animation, not
          a static "this section is dim" decision. */}
      <div
        aria-hidden="true"
        className="eikon-playground-vignette pointer-events-none absolute inset-0"
        style={{
          // -1 places the vignette above the dot grid (-10) and
          // below the halo (0) and the workbench frame (in DOM
          // order, paints last). The section's `isolate` keeps
          // the negative z-index from leaking under neighbouring
          // sections — the darkening is bounded to this stage.
          zIndex: -1,
          // `farthest-corner` ellipse is intentional here: the
          // workbench card spans almost the full section width,
          // so a small fixed-size ellipse would clip the dark
          // ring into the card's left/right edges. Letting the
          // gradient size itself relative to the corners means
          // the bright island always extends past the card no
          // matter the viewport, while the darkening still kicks
          // in clearly above/below and at the corners — the
          // negative space outside the card is what gets dimmed,
          // which is exactly the "stage spotlight" intent.
          background:
            'radial-gradient(ellipse farthest-corner at 50% 50%, transparent 45%, rgba(2, 6, 23, 0.7) 100%)',
        }}
      />

      {/* ---- Editorial heading ------------------------------------
          The loudest title on the page on purpose. Bigger than
          PlatformPicker above (text-2xl/3xl) and heavier than any
          downstream section. The LIVE eyebrow with its pulsing
          dot reinforces "real working tool", which pairs with the
          breathing playground frame underneath.

          Centred and spaced; we deliberately do NOT make it
          sticky. The workbench card right below carries the
          visual weight, and a sticky chapter heading would just
          take screen real estate from the surface that actually
          needs it. The visitor's eye lands on the heading once,
          then falls into the workbench.

          The header is `mx-auto max-w-3xl` even though the
          enclosing section breaks out to ~1760px — a heading
          stretched to the full workbench width would read as a
          tradeshow banner, not editorial. The card below is
          allowed to fill the wide section; the heading is not. */}
      <header className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
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
      </header>

      {/* ---- The workbench -----------------------------------------
          A single bordered, conic-ringed card whose internal grid
          carries the entire interaction loop: parameters and
          prompt on the left, the live three-pane shell on the
          right. The card height clamps to `min(82vh, 880px)` with
          a `640px` floor — tall enough to dominate the visitor's
          viewport (so the workbench reads as "the destination"),
          short enough that the card never overflows the screen on
          a 13" laptop or pushes the surrounding marketing context
          completely out of view.

          `eikon-conic-border` paints the slow 12s rotating slate
          ring around the perimeter; `eikon-playground-frame`
          drives a three-act cinematic move tied to scroll
          position, *layered as two scroll-driven animations*:

            1. PUSH IN  (cover  0% → 28%) — `scale(0.86)
               translateY(64px) opacity 0.4` → `scale(1.02)
               translateY(-2px) opacity 1`, while the cast
               shadow swells from a thin contact line to a
               180px ambient bowl. The lens dollies forward and
               overshoots `1.0` slightly so the move reads as a
               *push*, not a fade.
            2. SETTLE   (cover 28% → 38%) — relax to `scale(1)`,
               shadow tightens to its rest blur.
            3. HOLD     (cover 38% →100%) — `scale(1)` locked,
               shadow locked at its lifted rest value.
               More than half of the section's total scroll
               range is the workbench *staying* at peak presence
               — the "放大并停留" cinematic feel.

          The shadow is animated by a second scroll-driven
          keyframe (`eikon-playground-shadow`) layered on the
          same animation-timeline; we keep them as separate
          animations because shadow interpolation has its own
          paint cost and shouldn't piggy-back on every transform
          frame. The Tailwind `shadow-[…]` class on this element
          is the *fallback* — older browsers that skip the
          `@supports (animation-timeline: view())` block paint
          the rest-state shadow directly, so the workbench
          never appears "flat" without the cinematic move.

          `transform-origin: center` is intentional: the workbench
          is now an independent focal card (no longer pinned to
          the heading above), and a centred origin makes the push
          read as the lens zooming in on the card itself rather
          than as the card "growing out of" the heading — which
          would leave the bottom of the card visibly stretched on
          tall viewports. */}
      <div
        // Mobile: no fixed height — sidebar (params + prompt
        // stacked) and the playground frame each own their own
        // height; the card grows as tall as needed and the visitor
        // scrolls past it. We still ship `overflow-hidden` so the
        // rotating conic ring stays inside the rounded corners.
        // Desktop: the original clamp keeps the workbench dominant
        // without sprawling beyond ~880px on 4K monitors.
        className="eikon-conic-border eikon-playground-frame relative overflow-hidden rounded-2xl shadow-[0_60px_140px_-32px_rgb(0_0_0/0.6),0_24px_60px_-32px_rgb(15_23_42/0.45),0_0_0_1px_rgb(148_163_184/0.08)] lg:h-[clamp(640px,82vh,880px)]"
        style={{ transformOrigin: 'center' }}
      >
        <div className="flex h-full flex-col lg:flex-row">
          {/* ─── Left: collapsible sidebar (rail / peek / pinned)
              Same content as before (params + copyable prompt),
              now wrapped in `CollapsibleSidebar`:

                • Default pinned — first-time visitors see the
                  full params + prompt without having to discover
                  the rail. This matches the home-page intent of
                  showing the full "configure → preview → copy"
                  loop in one viewport.

                • After the user clicks the pin (or presses `[`)
                  the choice is persisted to localStorage under
                  `home-workbench`, independent of the dedicated
                  `/playground` page's pin state.

                • In peek state, the sidebar floats over the
                  PlaygroundShell within the bounds of the
                  workbench card (the card's `overflow-hidden`
                  intentionally contains the peek panel — it
                  never breaks out of the conic-ringed frame).

              The `<lg` layout (mobile/tablet) bypasses the rail
              and renders the static stacked layout, identical to
              the previous behaviour. */}
          <CollapsibleSidebar
            storageKey="home-workbench"
            ariaLabel="Workbench controls"
            defaultPinned
            sections={[
              {
                id: 'workbench-params',
                title: t('playgroundPage.paramsTitle'),
                icon: <SlidersIcon className="h-5 w-5" />,
                children: <ParamsPanel />,
                hideFromRail: true,
                mobileDefaultOpen: false,
              },
              {
                id: 'workbench-prompt',
                anchorId: PROMPT_OUTPUT_ANCHOR_ID,
                title: t('playgroundPage.promptTitle'),
                icon: <TerminalIcon className="h-5 w-5" />,
                children: <PromptOutput compact />,
                fill: true,
                hideTitle: true,
                hideFromRail: true,
                mobileDefaultOpen: true,
              },
            ]}
          />

          {/* ─── Right: live playground ─────────────────────────
              The three-pane shell (Toolbar + Files + Code +
              Preview). `min-h-0 min-w-0` lets the flex/grid
              parent shrink it below its intrinsic content size
              when the viewport is short, so the inner panes get
              their own scrollbars instead of forcing the
              workbench to overflow.

              On <lg the right column takes `min(70dvh, 640px)`
              with a 480px floor — tall enough to host a real
              preview, but never larger than the visible viewport
              (avoids "I can't see the rest of the workbench"
              on short phones). The shell switches to its compact
              tab-strip mode (`useIsCompactShell`) below 768px so
              this height hosts a single full-bleed view, not
              three competing strips. */}
          <main className="h-[min(70dvh,640px)] min-h-[480px] min-w-0 lg:h-auto lg:min-h-0 lg:flex-1">
            <PlaygroundShell />
          </main>
        </div>
      </div>
    </section>
  );
}
