/**
 * @file WorkbenchCard.tsx
 * @description The conic-ringed workbench card — the bordered focal
 * surface whose internal grid carries the entire interaction loop:
 * the params + prompt sidebar on the left, the live three-pane
 * `PlaygroundShell` on the right.
 *
 * Internal to PlaygroundSection. Extracted so the section file is a
 * thin shell (backdrop → header → card) and this file owns the
 * cinematic-frame styling rationale in one place. The prompt
 * sub-region's anchor id is threaded in as a prop so this file never
 * imports back from its parent (no import cycle) — the parent stays
 * the single source of truth for `PROMPT_OUTPUT_ANCHOR_ID`.
 */
import { PlaygroundShell } from '@/shell/App';

import { WorkbenchSidebar } from './WorkbenchSidebar';

export interface WorkbenchCardProps {
  /** Anchor id for the prompt sub-region — see `PROMPT_OUTPUT_ANCHOR_ID`. */
  promptAnchorId: string;
}

export function WorkbenchCard({ promptAnchorId }: WorkbenchCardProps) {
  return (
    // ---- The workbench -----------------------------------------
    // A single bordered, conic-ringed card whose internal grid
    // carries the entire interaction loop: parameters and
    // prompt on the left, the live three-pane shell on the
    // right. The card height clamps to `min(82vh, 880px)` with
    // a `640px` floor — tall enough to dominate the visitor's
    // viewport (so the workbench reads as "the destination"),
    // short enough that the card never overflows the screen on
    // a 13" laptop or pushes the surrounding marketing context
    // completely out of view.
    //
    // `eikon-conic-border` paints the slow 12s rotating slate
    // ring around the perimeter; `eikon-playground-frame`
    // drives a three-act cinematic move tied to scroll
    // position, *layered as two scroll-driven animations*:
    //
    //   1. PUSH IN  (cover  0% → 28%) — `scale(0.86)
    //      translateY(64px) opacity 0.4` → `scale(1.02)
    //      translateY(-2px) opacity 1`, while the cast
    //      shadow swells from a thin contact line to a
    //      180px ambient bowl. The lens dollies forward and
    //      overshoots `1.0` slightly so the move reads as a
    //      *push*, not a fade.
    //   2. SETTLE   (cover 28% → 38%) — relax to `scale(1)`,
    //      shadow tightens to its rest blur.
    //   3. HOLD     (cover 38% →100%) — `scale(1)` locked,
    //      shadow locked at its lifted rest value.
    //      More than half of the section's total scroll
    //      range is the workbench *staying* at peak presence
    //      — the "放大并停留" cinematic feel.
    //
    // The shadow is animated by a second scroll-driven
    // keyframe (`eikon-playground-shadow`) layered on the
    // same animation-timeline; we keep them as separate
    // animations because shadow interpolation has its own
    // paint cost and shouldn't piggy-back on every transform
    // frame. The Tailwind `shadow-[…]` class on this element
    // is the *fallback* — older browsers that skip the
    // `@supports (animation-timeline: view())` block paint
    // the rest-state shadow directly, so the workbench
    // never appears "flat" without the cinematic move.
    //
    // `transform-origin: center` is intentional: the workbench
    // is now an independent focal card (no longer pinned to
    // the heading above), and a centred origin makes the push
    // read as the lens zooming in on the card itself rather
    // than as the card "growing out of" the heading — which
    // would leave the bottom of the card visibly stretched on
    // tall viewports.
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
        <WorkbenchSidebar promptAnchorId={promptAnchorId} />

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
        <main className="h-[min(65dvh,640px)] min-h-[400px] min-w-0 sm:h-[min(70dvh,640px)] sm:min-h-[480px] lg:h-auto lg:min-h-0 lg:flex-1">
          <PlaygroundShell />
        </main>
      </div>
    </div>
  );
}
