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
  const controller = useSidebarMode({
    storageKey,
    defaultPinned,
    enabled: isLg,
  });

  if (!isLg) {
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
