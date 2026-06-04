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
 *   The previous home page split this into PlatformPicker →
 *   PlaygroundSection (params + frame) → PromptOutput, forcing the
 *   visitor to scroll between three loosely-tied surfaces to see the
 *   result of a single configuration choice. Pulling params + frame
 *   + prompt into one workbench card makes that wiring physical:
 *   every change happens within one bordered surface and the page
 *   reads as "the playground is the destination". PlatformPicker
 *   stays upstream as its own editorial "what does this template
 *   ship?" overview — its triple-card layout would feel cramped
 *   inside this workbench's sidebar.
 *
 * Why we still don't scroll-jack
 * ------------------------------
 *   Sticky pinning would *trap* the wheel until the visitor
 *   "completed" the surface. But every sub-region here has its own
 *   scrollbar (file tree, code editor, preview iframe, prompt
 *   `<pre>`, sidebar overflow), and a hijacked outer wheel would
 *   collide with the inner one. Instead we use a tall-but-bounded
 *   card (`clamp(640px, 82vh, 880px)`): the workbench takes most of
 *   the viewport so the eye rests on it, but the page never stops
 *   responding to the wheel — scroll past it the moment you're done.
 *
 * Composition
 * -----------
 *   The section's visual parts each live in a sibling file under
 *   `./playground-section/` and are internal to this section:
 *     · WorkbenchBackdrop — the three decorative background layers.
 *     · WorkbenchHeader   — the LIVE eyebrow + heading + subtitle.
 *     · WorkbenchCard     — the conic-ringed frame wrapping the
 *                            sidebar (params + prompt) and the shell.
 *   This file owns the section shell plus the two anchors:
 *       · PLAYGROUND_ANCHOR_ID  — the section as a whole, scrolled
 *                                 to from "Get started" once the
 *                                 platform is chosen.
 *       · PROMPT_OUTPUT_ANCHOR_ID — the sidebar's prompt sub-region,
 *                                   scrolled to from the Hero's
 *                                   "find it" pill.
 */

import { WorkbenchBackdrop } from './playground-section/WorkbenchBackdrop';
import { WorkbenchCard } from './playground-section/WorkbenchCard';
import { WorkbenchHeader } from './playground-section/WorkbenchHeader';

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
      <WorkbenchBackdrop />

      <WorkbenchHeader />

      <WorkbenchCard promptAnchorId={PROMPT_OUTPUT_ANCHOR_ID} />
    </section>
  );
}
