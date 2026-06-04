/**
 * @file WorkbenchBackdrop.tsx
 * @description The three stacked, purely-decorative background
 * layers that sit *behind* the playground workbench card and give
 * the section its "lit from behind / stage spotlight" feel.
 *
 * Internal to PlaygroundSection — not exported from any feature
 * barrel. Split out of `PlaygroundSection.tsx` because these three
 * `aria-hidden` layers (halo, drifting dot grid, cinematic vignette)
 * are a self-contained visual unit with no props and no interaction:
 * lifting them here keeps the workbench's structural JSX legible
 * while preserving every class, inline style and z-index exactly.
 *
 * Render order (DOM order = paint order within the section's
 * `isolate` stacking context):
 *
 *   1. Halo            (-z-0)  radial slate wash hugging the card.
 *   2. Drifting grid   (-z-10) tiled dot pattern, masked top/bottom.
 *   3. Stage vignette  (z-index -1) darkens the negative space
 *                       *around* the card, leaving the card lit.
 *
 * All three degrade gracefully: the scroll-driven keyframes
 * (`eikon-playground-halo`, `eikon-grid-drift`,
 * `eikon-playground-vignette`) paint a sensible rest state in
 * browsers without `animation-timeline: view()` and are disabled
 * under reduced-motion — see `styles/playground.css`.
 */
export function WorkbenchBackdrop() {
  return (
    <>
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
    </>
  );
}
