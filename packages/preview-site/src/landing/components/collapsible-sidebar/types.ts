import type { ReactNode } from 'react';

export type { SidebarController } from '../../hooks/useSidebarMode';

/**
 * Tailwind's `lg` breakpoint. We need this both at the CSS level
 * (Tailwind utility classes) and at the JS level (to decide which
 * variant to *mount*, not just which to display). Without the JS
 * gate, mounting both the mobile stack and the desktop panel
 * results in duplicate DOM IDs (e.g. `prompt-output`) and breaks
 * `scrollIntoView` (which can resolve to a `display: none`
 * element and silently no-op).
 */
export const LG_MEDIA_QUERY = '(min-width: 1024px)';

/** Width of the rail in collapsed state. Tuned to fit a 20px icon
 *  plus generous tap target on both sides while still reading as
 *  "edge ornament" rather than "second sidebar". */
export const RAIL_WIDTH_PX = 48;

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
  /**
   * Whether this section starts expanded in the mobile accordion
   * (`< lg`). Desktop has no concept of per-section open state —
   * the entire panel is either rail/peek/pinned, so this flag is
   * ignored above `lg`.
   *
   * When omitted, the default is: `fill === true` ? true : false.
   * Callers should set this explicitly for any section the visitor
   * benefits from seeing immediately (e.g. a Platform picker or
   * a Prompt output) so the mobile experience doesn't open onto
   * a wall of closed disclosures.
   */
  mobileDefaultOpen?: boolean;
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
