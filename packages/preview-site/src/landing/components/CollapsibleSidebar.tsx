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

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { useI18n } from '../theme/i18n';
import { useSidebarMode, type SidebarController } from '../hooks/useSidebarMode';

/**
 * Tailwind's `lg` breakpoint. We need this both at the CSS level
 * (Tailwind utility classes) and at the JS level (to decide which
 * variant to *mount*, not just which to display). Without the JS
 * gate, mounting both the mobile stack and the desktop panel
 * results in duplicate DOM IDs (e.g. `prompt-output`) and breaks
 * `scrollIntoView` (which can resolve to a `display: none`
 * element and silently no-op).
 */
const LG_MEDIA_QUERY = '(min-width: 1024px)';

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

/**
 * One labelled block inside the sidebar. The optional icon shows up
 * on the collapsed rail as a quick-jump button; clicking it opens
 * the peek and scrolls the corresponding section into view.
 */
export interface SidebarSectionSpec {
  /** Unique id — used for `aria-controls`, scroll targets, and React keys. */
  id: string;
  /** Heading text rendered inside the open sidebar. */
  title: string;
  /** SVG icon node (24x24, currentColor). Rendered on the collapsed rail. */
  icon: ReactNode;
  /** Section contents (panel body). */
  children: ReactNode;
  /** If true, the section greedily takes remaining vertical space. */
  fill?: boolean;
  /** Optional DOM id forwarded to the section element (e.g. scroll anchors). */
  anchorId?: string;
}

export interface CollapsibleSidebarProps {
  /** Persistence key — keep distinct between page and workbench. */
  storageKey: string;
  /** ARIA label for the outermost wrapper. */
  ariaLabel: string;
  /** Sections to render. Icons appear on the collapsed rail. */
  sections: SidebarSectionSpec[];
  /**
   * Extra classes for the open sidebar / peek panel (e.g. the
   * workbench wants `rounded-l-2xl` so the panel hugs the card's
   * rounded corner, while the standalone page wants flat edges).
   */
  panelClassName?: string;
  /** Extra classes for the rail (e.g. background tuning). */
  railClassName?: string;
  /**
   * Whether the sidebar is pinned by default on first visit
   * (before any localStorage value exists). Defaults to `true`.
   */
  defaultPinned?: boolean;
}

/** Width of the rail in collapsed state. Tuned to fit a 20px icon
 *  plus generous tap target on both sides while still reading as
 *  "edge ornament" rather than "second sidebar". */
const RAIL_WIDTH_PX = 48;

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
    return (
      // Mobile (< lg): stacked, always-open layout. Touch viewports
      // get the static sidebar with every section inline — no
      // hidden state, no hover-peek, no pin toggle.
      <div
        aria-label={ariaLabel}
        className="flex w-full min-w-0 flex-col gap-4"
      >
        {sections.map((section) => (
          <SidebarSection key={section.id} section={section} />
        ))}
      </div>
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

interface DesktopProps {
  controller: SidebarController;
  ariaLabel: string;
  sections: SidebarSectionSpec[];
  panelClassName: string;
  railClassName: string;
}

function DesktopCollapsibleSidebar({
  controller,
  ariaLabel,
  sections,
  panelClassName,
  railClassName,
}: DesktopProps) {
  const { isPinned, isPeeking } = controller;

  // Width contract:
  //   - pinned   : full sidebar width participates in layout, no
  //                rail (the open panel replaces it).
  //   - else     : rail width participates in layout; peek panel
  //                floats absolutely so opening it never shifts the
  //                preview pane.
  //
  // The width is driven entirely from inline `style` (Tailwind JIT
  // can't statically see runtime-constructed `lg:w-[...]` strings),
  // so we keep the className purely structural and let `style.width`
  // be the single source of truth. The `transition-[width]` class
  // still animates the change because inline-style width changes
  // also trigger CSS transitions when a matching transition is set.
  const rootWidth = isPinned
    ? 'clamp(340px, 24vw, 440px)'
    : `${RAIL_WIDTH_PX}px`;

  return (
    <div
      aria-label={ariaLabel}
      // `relative` is for the peek panel's `position: absolute`
      // child. `shrink-0` keeps the rail/panel from being squashed
      // when the playground sibling is greedy.
      //
      // Width transition: `.eikon-sidebar-width` uses the silky
      // `--ease-glide` curve over 420ms — the dominant tween in
      // the whole collapse experience. Tuning this curve / duration
      // changes the feel of every pin/unpin action.
      //
      // Overflow contract:
      //   - peeking : visible — the peek panel is absolutely
      //               positioned at `left: 48px` and extends well
      //               past the wrapper's 48px width. We *also*
      //               need it visible during the EXIT animation
      //               (the panel translates back out by 10px and
      //               must not be clipped at the rail edge), which
      //               is why the condition checks "any panel
      //               present", not just "currently peeking".
      //   - else    : hidden — during the collapsed↔pinned width
      //               transition (420ms), inner content briefly
      //               exists at a different intrinsic width than
      //               the animating wrapper; clipping prevents the
      //               "overflowing into the playground" flash.
      className={`eikon-sidebar-width relative flex shrink-0 ${
        !isPinned ? 'overflow-visible' : 'overflow-hidden'
      }`}
      style={{ width: rootWidth }}
    >
      {/* RAIL — present only when not pinned. Acts as the always-on
          "magnetic edge" affordance: hovering it opens peek,
          clicking the body or any icon opens peek instantly. */}
      {!isPinned && (
        <Rail
          controller={controller}
          sections={sections}
          railClassName={railClassName}
        />
      )}

      {/* PINNED PANEL — participates in layout when pinned, no
          enter/exit animation (the wrapper width transition
          carries the visual change). Rendered separately from the
          PeekPanel so the two never collide on the same key. */}
      {isPinned && (
        <PinnedPanel
          controller={controller}
          sections={sections}
          panelClassName={panelClassName}
        />
      )}

      {/* PEEK PANEL — floats above the playground, owns its own
          enter/exit lifecycle (slides + fades in over 380ms with
          --ease-glide, slides + fades out over 260ms with
          --ease-silk). Stays mounted through the exit animation
          before unmounting — this is the single biggest
          "silkiness" contributor in the whole component. */}
      <PeekPanel
        visible={isPeeking}
        controller={controller}
        sections={sections}
        panelClassName={panelClassName}
      />
    </div>
  );
}

/* ============================================================
 * RAIL — the slim 48px column shown in collapsed/peeking state.
 * ============================================================ */

interface RailProps {
  controller: SidebarController;
  sections: SidebarSectionSpec[];
  railClassName: string;
}

function Rail({ controller, sections, railClassName }: RailProps) {
  const { t } = useI18n();
  const { triggerProps, openPeekNow, isPeeking } = controller;

  return (
    <div
      {...triggerProps}
      // `eikon-rail-glow` paints the slow vertical brightness
      // sweep on the rail's right edge (slower than the workbench
      // ring, smooth opacity tween on hover via --ease-silk).
      // `eikon-rail-magnet` does the silky bg + box-shadow swell
      // on hover (360ms with --ease-silk). data-active mirrors
      // the peek state so the rail keeps its lit treatment while
      // the panel is out.
      data-active={isPeeking || undefined}
      className={`eikon-rail-glow eikon-rail-magnet relative flex h-full w-full flex-col items-center justify-between border-r border-[var(--border-1)] bg-[var(--surface-0)]/60 py-3 backdrop-blur-sm ${railClassName}`}
    >
      {/* Top tag — chevron expand button. Uses .eikon-rail-icon
          for the silky 280ms hover transition (bg + color), and
          .eikon-rail-icon-glyph on the inner SVG wrapper so the
          icon scales up on hover with its own 320ms tween. */}
      <RailButton
        ariaLabel={t('sidebar.expand')}
        title={`${t('sidebar.expand')}  [ `}
        onClick={openPeekNow}
      >
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </RailButton>

      {/* Icon column — one button per section. Each is a
          quick-jump: clicking opens peek AND scrolls its section
          into view in the panel. */}
      <nav
        aria-label={t('sidebar.sectionsNav')}
        className="flex flex-col items-center gap-1"
      >
        {sections.map((section) => (
          <RailIconButton
            key={section.id}
            section={section}
            controller={controller}
          />
        ))}
      </nav>

      {/* Pin shortcut at bottom — same icon as the in-panel pin,
          for visual continuity. Hovering it also opens the peek
          (so users discover what "the thing with the pin" is). */}
      <RailButton
        ariaLabel={t('sidebar.openAndPin')}
        title={`${t('sidebar.openAndPin')}  [ `}
        onPointerEnter={openPeekNow}
        onClick={controller.togglePin}
      >
        <PinIcon className="h-3.5 w-3.5" />
      </RailButton>
    </div>
  );
}

/** Small button shared by the rail's chevron + pin slots. Encapsulates
 *  the silky transition classes (`.eikon-rail-icon` for the wrapper,
 *  `.eikon-rail-icon-glyph` for the inner SVG scale tween) so all
 *  three rail affordances feel identical on hover. */
function RailButton({
  ariaLabel,
  title,
  onClick,
  onPointerEnter,
  children,
}: {
  ariaLabel: string;
  title: string;
  onClick?: () => void;
  onPointerEnter?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      className="eikon-rail-icon flex h-7 w-7 items-center justify-center rounded-md text-[var(--fg-4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
    >
      <span className="eikon-rail-icon-glyph pointer-events-none">
        {children}
      </span>
    </button>
  );
}

interface RailIconButtonProps {
  section: SidebarSectionSpec;
  controller: SidebarController;
}

function RailIconButton({ section, controller }: RailIconButtonProps) {
  const { t } = useI18n();
  const { openPeekNow } = controller;

  return (
    <button
      type="button"
      aria-label={`${t('sidebar.jumpTo')} ${section.title}`}
      title={section.title}
      aria-controls={section.anchorId ?? section.id}
      onClick={() => {
        openPeekNow();
        requestAnimationFrame(() => {
          const target = document.getElementById(section.anchorId ?? section.id);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }}
      className="eikon-rail-icon relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--fg-4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
    >
      <span className="eikon-rail-icon-glyph pointer-events-none">
        {section.icon}
      </span>
    </button>
  );
}

/* ============================================================
 * PINNED PANEL — sits in layout, no animation, always visible
 * while `isPinned`. The wrapper's width transition carries the
 * visual change between pinned and collapsed.
 * ============================================================ */

interface PinnedPanelProps {
  controller: SidebarController;
  sections: SidebarSectionSpec[];
  panelClassName: string;
}

function PinnedPanel({
  controller,
  sections,
  panelClassName,
}: PinnedPanelProps) {
  const { t } = useI18n();
  return (
    <div
      className={`relative h-full w-full border-r border-[var(--border-1)] bg-[var(--surface-0)]/60 ${panelClassName}`}
      aria-label={t('sidebar.controlsLabel')}
    >
      <PanelContent controller={controller} sections={sections} floating={false} />
    </div>
  );
}

/* ============================================================
 * PEEK PANEL — floats above the playground while peeking,
 * owns its own enter/exit lifecycle via a 4-state machine:
 *
 *     closed ──visible─→ opening ──380ms─→ open
 *        ▲                                   │
 *        │                                   │ ¬visible
 *      260ms                                 ▼
 *        └──────── closing ←──────────── (still open in DOM)
 *
 * The "closing" phase keeps the panel mounted while
 * `.eikon-peek-out` runs (slide + fade back to the rail edge),
 * then unmounts. A re-open mid-close cancels the close timer
 * and snaps back to `open` without re-triggering the entrance
 * animation — important for jittery cursors near the trigger
 * boundary, where without this you'd see in/out flickering.
 * ============================================================ */

type PeekPhase = 'closed' | 'opening' | 'open' | 'closing';

/** Must match the keyframe duration in `styles/index.css`
 *  (`.eikon-peek-in` → 380ms, `.eikon-peek-out` → 260ms). */
const PEEK_ENTER_DURATION_MS = 380;
const PEEK_EXIT_DURATION_MS = 260;

interface PeekPanelProps {
  visible: boolean;
  controller: SidebarController;
  sections: SidebarSectionSpec[];
  panelClassName: string;
}

function PeekPanel({
  visible,
  controller,
  sections,
  panelClassName,
}: PeekPanelProps) {
  const { t } = useI18n();
  const { panelProps, closePeekNow } = controller;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<PeekPhase>(visible ? 'open' : 'closed');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (visible) {
      // Re-opening while still closing → snap back to `open`
      // without replaying the entrance (avoids visible "ghost"
      // animation when cursor crosses the trigger boundary
      // multiple times quickly).
      if (phase === 'closed') {
        setPhase('opening');
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          setPhase('open');
        }, PEEK_ENTER_DURATION_MS);
      } else if (phase === 'closing') {
        setPhase('open');
      }
    } else {
      // Going invisible — start exit animation, then unmount
      // when it completes. If we were still in the entrance
      // animation, cut to "closing" immediately; the eye accepts
      // a fade-out from any mid-entrance state.
      if (phase === 'open' || phase === 'opening') {
        setPhase('closing');
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          setPhase('closed');
        }, PEEK_EXIT_DURATION_MS);
      }
    }
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // We intentionally depend only on `visible` — re-running on
    // phase changes would create a loop (the effect itself sets
    // phase). The `phase` snapshot above is read at the moment
    // `visible` flips, which is exactly the transition we want
    // to drive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Click-away — applies only while the peek is visible (open OR
  // closing). During the closing animation we still want a click
  // outside to be a no-op rather than re-triggering anything.
  useEffect(() => {
    if (phase === 'closed' || phase === 'closing') return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      // Don't dismiss when the user clicked the rail itself —
      // that's how they just opened us in the first place.
      if ((target as HTMLElement).closest?.('.eikon-rail-glow')) return;
      closePeekNow();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [phase, closePeekNow]);

  if (phase === 'closed') return null;

  // Pick the animation class for the current phase. `opening` and
  // `open` both use the enter class (the animation has `both` fill
  // mode, so when it finishes the end keyframe stays applied — we
  // can leave the class on for `open` without re-triggering).
  const animationClass =
    phase === 'closing' ? 'eikon-peek-out' : 'eikon-peek-in';

  return (
    <div
      ref={panelRef}
      {...panelProps}
      data-state={phase}
      className={`${animationClass} absolute top-0 z-30 h-full border border-l-0 border-[var(--border-1)] bg-[var(--surface-0)]/85 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.6),0_8px_24px_-8px_rgb(15_23_42/0.4)] backdrop-saturate-150 ${panelClassName}`}
      style={{
        left: `${RAIL_WIDTH_PX}px`,
        width: 'clamp(320px, 24vw, 420px)',
        // backdrop-filter is animated by the keyframes; we leave
        // the inline value undefined here so the keyframe's
        // animated value drives painting. The end keyframe applies
        // permanently (animation-fill-mode: both) so the open
        // panel stays blurred after the entrance finishes.
      }}
      role="dialog"
      aria-modal={false}
      aria-label={t('sidebar.controlsLabel')}
    >
      <PanelContent controller={controller} sections={sections} floating />
    </div>
  );
}

/* ============================================================
 * PANEL CONTENT — header strip + scrollable sections, shared by
 * both PinnedPanel and PeekPanel so the visuals stay identical.
 * ============================================================ */

interface PanelContentProps {
  controller: SidebarController;
  sections: SidebarSectionSpec[];
  /** Whether this content is rendered inside the floating peek
   *  panel (true) or the pinned in-layout panel (false). Drives
   *  the close button (only shown when floating) and the collapse
   *  button (only shown when pinned). */
  floating: boolean;
}

function PanelContent({ controller, sections, floating }: PanelContentProps) {
  const { t } = useI18n();
  const { isPinned, togglePin, unpin, closePeekNow } = controller;

  return (
    <>
      {/* Header strip — title + action buttons. Pin toggle is the
          star: clicking it from peek state promotes the panel to
          pinned (sidebar stays open and starts participating in
          layout); clicking it from pinned state demotes back to
          collapsed. Esc / [ keyboard shortcuts work in parallel.
          The pin icon uses `.eikon-pin-icon[data-pinned]` for the
          silky 480ms rotation tween (longer than the bg fade — the
          icon keeps turning after the colour settles, which reads
          as "the action committed"). */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-1)]/60 px-4 py-3 lg:px-5">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-3)]">
          <SlidersIcon className="h-3.5 w-3.5" />
          <span>{t('sidebar.controlsLabel')}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={isPinned ? t('sidebar.unpin') : t('sidebar.pin')}
            aria-pressed={isPinned}
            title={`${isPinned ? t('sidebar.unpin') : t('sidebar.pin')}  [ `}
            onClick={togglePin}
            className={`eikon-rail-icon flex h-7 w-7 items-center justify-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${
              isPinned ? 'text-brand-300' : 'text-[var(--fg-4)]'
            }`}
          >
            <PinIcon
              className="eikon-pin-icon h-3.5 w-3.5"
              data-pinned={isPinned ? 'true' : 'false'}
            />
          </button>
          {floating && (
            <button
              type="button"
              aria-label={t('sidebar.close')}
              title={t('sidebar.close')}
              onClick={closePeekNow}
              className="eikon-rail-icon flex h-7 w-7 items-center justify-center rounded-md text-[var(--fg-4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          )}
          {isPinned && (
            <button
              type="button"
              aria-label={t('sidebar.collapse')}
              title={`${t('sidebar.collapse')}  [ `}
              onClick={unpin}
              className="eikon-rail-icon flex h-7 w-7 items-center justify-center rounded-md text-[var(--fg-4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content area — same overflow behaviour as the
          old static sidebar, so long content (params on a tall
          variant) scrolls internally rather than pushing the page. */}
      <div className="flex h-[calc(100%-49px)] min-h-0 flex-col gap-5 overflow-y-auto p-4 sm:p-5">
        {sections.map((section) => (
          <SidebarSection key={section.id} section={section} />
        ))}
      </div>
    </>
  );
}

function SidebarSection({ section }: { section: SidebarSectionSpec }) {
  return (
    <section
      id={section.anchorId ?? section.id}
      className={'flex min-h-0 flex-col gap-2 ' + (section.fill ? 'flex-1' : '')}
      aria-label={section.title}
    >
      <h3 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-3)]">
        <span className="text-[var(--fg-4)]">{section.icon}</span>
        <span>{section.title}</span>
      </h3>
      <div className={'min-h-0 ' + (section.fill ? 'flex flex-1 flex-col' : '')}>
        {section.children}
      </div>
    </section>
  );
}

/* ============================================================
 * ICONS — inline 1.5px-stroke SVGs, sized with className.
 * ============================================================ */

interface IconProps {
  className?: string;
}

export function TargetIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function SlidersIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="9" cy="6" r="2" fill="var(--surface-0)" />
      <circle cx="15" cy="12" r="2" fill="var(--surface-0)" />
      <circle cx="7" cy="18" r="2" fill="var(--surface-0)" />
    </svg>
  );
}

export function TerminalIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="5 8 9 12 5 16" />
      <line x1="12" y1="17" x2="19" y2="17" />
    </svg>
  );
}

function PinIcon({
  className,
  'data-pinned': dataPinned,
}: IconProps & { 'data-pinned'?: string }) {
  return (
    <svg
      className={className}
      data-pinned={dataPinned}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 17v5" />
      <path d="M9 3h6l-1 5 3 3v3H7v-3l3-3-1-5z" />
    </svg>
  );
}

function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 6 9 12 15 18" />
    </svg>
  );
}

function CloseIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}
