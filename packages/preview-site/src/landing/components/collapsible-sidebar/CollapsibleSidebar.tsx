/**
 * @file CollapsibleSidebar.tsx
 * @description Three-state sidebar with hover-peek + click-to-pin
 * interaction. Designed for the playground surfaces (the standalone
 * `/playground` page and the home page workbench), where the
 * parameter controls are useful but visually heavy and most visitors
 * spend the majority of their time looking at the live preview.
 *
 * Three visual states (driven by `useSidebarMode`):
 *
 *   STATE A — COLLAPSED  (default after collapse)
 *   ┌───┐                      ┌────────────────────────────┐
 *   │ ▎ │  ← 48px rail          │                            │
 *   │ ⌖ │  ← vertical icon      │   Playground (full width)  │
 *   │ ⚙ │     buttons jump to    │                            │
 *   │ ❯⟩│     their section      │                            │
 *   │ ◇ │                      │                            │
 *   │ ▎ │  ← pin button          │                            │
 *   └───┘                      └────────────────────────────┘
 *
 *   STATE B — PEEKING    (transient hover overlay)
 *   ┌───┬─────────────────┐    ┌────────────────────────────┐
 *   │ ▎ │ Parameters       │    │                            │
 *   │ ⌖ │  · Design        │    │   Playground (behind,     │
 *   │ ⚙ │  · Layout        │ ▎▎▎│   slightly blurred)        │
 *   │ ❯⟩│ Prompt           │    │                            │
 *   │ ◇ │ ┌─────────────┐ │    │                            │
 *   │ ▎ │ │ npx …       │ │    │                            │
 *   └───┴─────────────────┘    └────────────────────────────┘
 *      Floats over playground; no layout shift.
 *
 *   STATE C — PINNED     (sidebar participates in layout)
 *   ┌──────────────────────────┬───────────────────────────┐
 *   │ Parameters         📌 ⨯ │                            │
 *   │  · Design                │   Playground (shrunk)      │
 *   │  · Layout                │                            │
 *   │ Prompt                   │                            │
 *   └──────────────────────────┴───────────────────────────┘
 *
 * Layout contract
 * ---------------
 * The component renders ONE root element that snaps into a flex row
 * alongside the playground. The root's width is dynamic:
 *
 *   - collapsed   : 48px  (rail only)
 *   - peeking     : 48px in layout + an absolutely-positioned panel
 *                   overlaying the playground; no width change so
 *                   the preview stays put.
 *   - pinned      : ~clamp(340px, 24vw, 440px) in layout; the
 *                   playground shrinks correspondingly.
 *
 * Because the peek panel uses `position: absolute`, **the parent
 * container must be `position: relative` (or any positioned
 * ancestor)** for the overlay to anchor correctly. Both the
 * standalone playground page and the workbench card satisfy this.
 *
 * Mobile (`< lg`)
 * ---------------
 * The folding interaction is desktop-only. Below `lg` we bypass the
 * mode controller entirely and render every section in a stacked
 * full-width sidebar — touch users get the same content with zero
 * hidden state. The component reads its breakpoint via Tailwind
 * classes (`hidden lg:flex` for the rail; `flex lg:hidden` for the
 * mobile stack), so there's no JS media query and no first-paint
 * mismatch.
 *
 * Accessibility
 * -------------
 *   - Rail icon buttons carry `aria-label` and `aria-controls`
 *     pointing at the corresponding section id; clicking one in
 *     collapsed state opens peek and scrolls the section into view.
 *   - The pin button is a toggle (`aria-pressed`) with a clear
 *     spoken label ("Pin sidebar" / "Unpin sidebar").
 *   - Keyboard: focus the rail with Tab — Enter on any rail icon
 *     opens peek; `[` toggles pin from anywhere on the page; `Esc`
 *     dismisses a transient peek.
 *   - All motion respects `prefers-reduced-motion: reduce`
 *     (delegated to the `.eikon-*` classes in `styles/index.css`).
 */

import { useEffect, useState } from 'react';

import { useSidebarMode } from '../../hooks/useSidebarMode';
import type { CollapsibleSidebarProps } from './types';
import { LG_MEDIA_QUERY } from './types';
import { DesktopCollapsibleSidebar } from './DesktopSidebar';
import { MobileSidebarAccordion } from './MobileSidebar';

function useIsLargeViewport(): boolean {
  // Initialise from `window.matchMedia` synchronously so the first
  // paint already commits to the correct variant (this is a Vite
  // SPA — no SSR — so `window` is always defined on the first
  // client render). The `useState` initialiser still guards `window`
  // for safety in case the component is ever imported in a Node
  // context (e.g. a future SSR/SSG migration).
  const [isLarge, setIsLarge] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true;
    }
    return window.matchMedia(LG_MEDIA_QUERY).matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia(LG_MEDIA_QUERY);
    const handler = (event: MediaQueryListEvent) => setIsLarge(event.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isLarge;
}

export function CollapsibleSidebar({
  storageKey,
  ariaLabel,
  sections,
  panelClassName = '',
  railClassName = '',
  defaultPinned = true,
}: CollapsibleSidebarProps) {
  const isLg = useIsLargeViewport();
  // The hook is no-op when `enabled: false` (no keyboard listener,
  // no peek timers), so on mobile we save the global keydown
  // listener and avoid spurious peek state from synthetic events.
  const controller = useSidebarMode({
    storageKey,
    defaultPinned,
    enabled: isLg,
  });

  // We intentionally mount EITHER the mobile stack OR the desktop
  // panel — never both — to avoid duplicate DOM IDs (the prompt
  // section carries `PROMPT_OUTPUT_ANCHOR_ID`, which the Hero's
  // "find it" pill scrolls to via `getElementById`). Mounting both
  // would resolve the id to whichever element is first in document
  // order, often the `display: none` mobile copy, which then
  // silently breaks `scrollIntoView`.
  if (!isLg) {
    // Mobile (< lg): vertical accordion. Touch viewports get every
    // section, but each is a collapsible disclosure so the page
    // doesn't open onto a one-screen-tall list of expanded forms
    // (the original stacked layout was easily ~3-4 screens on a
    // 6"-class phone, which buried the Prompt output below the
    // fold and made the visitor feel they'd lost the playground).
    //
    // OPEN-STATE POLICY
    //
    //   By default we open:
    //     - the FIRST section (the target / platform picker — the
    //       single most useful thing to land on, since changing
    //       platform is the visitor's primary mode of exploration)
    //     - the LAST `fill` section (typically the prompt output —
    //       the artifact the visitor came here to copy)
    //
    //   Heavy sections in the middle (params) start collapsed.
    //   Visitors who want them just tap to expand.
    //
    //   We keep state local — visitors don't need persistence
    //   here, and avoiding localStorage on the home workbench
    //   means the marketing page stays "pure rendering".
    return (
      <MobileSidebarAccordion
        ariaLabel={ariaLabel}
        sections={sections}
      />
    );
  }

  return (
    <DesktopCollapsibleSidebar
      controller={controller}
      ariaLabel={ariaLabel}
      sections={sections}
      panelClassName={panelClassName}
      railClassName={railClassName}
    />
  );
}
