import type { CSSProperties } from 'react';

import type { FrameSize } from '../store';
import type { DeviceShellProps } from './types';
import { DESKTOP_SCREEN } from './types';
import { APPLE_TOKENS } from './tokens';
import { TrafficLights } from './DesktopShell';

// =================================================================================================
// WebShell — Chrome on macOS chrome
// =================================================================================================
//
// Chrome differs from Safari in two visible ways the previous design
// missed:
//
//   1. The tab strip sits ABOVE the toolbar (Chrome) rather than below
//      (Safari).
//   2. The whole top chrome is tinted with a tonal "surface-container"
//      colour (a soft lavender / cool grey), with the active tab
//      "punching out" of that tint into the toolbar below — the visual
//      effect is that the tab is part of the same surface as the page,
//      and the inactive area surrounds it.
//
// We keep the macOS traffic-light cluster on the leading edge of the
// tab strip because the preview is still presented as a macOS window;
// only the browser-chrome conventions change. Trailing toolbar icons
// are intentionally minimal per the latest design reference — just
// one extension glyph and a profile dot — so the chrome doesn't read
// as cluttered next to the actual previewed app.

export const CHROME_TAB_BAR_HEIGHT = 36;
export const CHROME_TOOLBAR_HEIGHT = 40;

export const CHROME_TOKENS = {
  // Tab strip tint — Chrome 122+ "surface-container" but pulled toward
  // neutral so it harmonises with the macOS Sequoia desktop shell and
  // the titanium iPhone in the other two platforms. The original
  // `#dee3ec` lavender felt too saturated when all three shells sat
  // next to each other in a marketing screenshot.
  tabStripBg: '#e8e9ec',
  // Toolbar + active-tab surface (they share a colour so the tab reads
  // as cut out of the toolbar).
  surfaceBg: '#ffffff',
  // URL pill: light, slightly cooler than pure surface so it reads as
  // a recessed input on the toolbar.
  urlPillBg: '#f1f3f4',
  urlPillBgHover: '#e8eaed',
  urlPillBorder: 'transparent',
  // Foregrounds
  fg: '#1f1f1f',
  fgMuted: '#5f6368',
  // Profile circle (the avatar dot on the trailing edge). Neutral
  // slate-grey rather than the vivid purple Chrome uses by default —
  // a single colour dot is enough to read as "profile" without
  // pulling visual attention from the previewed app.
  profileBg: '#6b7280',
} as const;

export function WebShell({
  size,
  title,
  domain,
  children,
}: {
  size: FrameSize;
  title: string;
  domain: string;
  children: DeviceShellProps['children'];
}) {
  const screen = DESKTOP_SCREEN[size];
  const radius = 12;
  const totalChrome = CHROME_TAB_BAR_HEIGHT + CHROME_TOOLBAR_HEIGHT;

  return (
    <div
      style={{
        position: 'relative',
        width: screen.width,
        height: screen.height + totalChrome,
        maxWidth: '100%',
        maxHeight: '100%',
        transition: 'width 420ms cubic-bezier(0.16, 1, 0.3, 1), height 420ms cubic-bezier(0.16, 1, 0.3, 1)',
        background: CHROME_TOKENS.surfaceBg,
        borderRadius: radius,
        boxShadow: APPLE_TOKENS.bodyShadow,
        border: `1px solid ${APPLE_TOKENS.windowBorder}`,
        overflow: 'hidden',
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
      }}
      role="img"
      aria-label="Chrome browser preview"
    >
      <ChromeTopChrome domain={domain} title={title} />
      <div style={{ flex: 1, position: 'relative' }}>
        {children({
          width: '100%',
          height: '100%',
          border: 0,
          borderRadius: 0,
          background: '#fff',
        })}
      </div>
    </div>
  );
}

export function ChromeTopChrome({
  domain,
  title,
}: {
  domain: string;
  title: string;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        userSelect: 'none',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif',
      }}
    >
      {/* ---- Tab strip (top row) ---- */}
      <div
        style={{
          height: CHROME_TAB_BAR_HEIGHT,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 4,
          padding: '0 10px 0 12px',
          background: CHROME_TOKENS.tabStripBg,
        }}
      >
        <span style={{ alignSelf: 'center' }}>
          <TrafficLights />
        </span>
        <span style={{ width: 8 }} />
        <ChromeTab title={title} active />
        <NewTabButton />
        <span style={{ flex: 1 }} />
        <ProfileDot />
      </div>
      {/* ---- Toolbar (bottom row) — back / forward / reload + URL ---- */}
      <div
        style={{
          height: CHROME_TOOLBAR_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 12px',
          background: CHROME_TOKENS.surfaceBg,
        }}
      >
        <NavButtonRow />
        <UrlBar domain={domain} />
        <ToolbarTrailing />
      </div>
    </div>
  );
}

export function NavButtonRow() {
  // Back / forward / reload — Chrome's three left-side nav buttons.
  // Each is a circular icon button (≠ Safari's squared keys). The
  // forward arrow is dimmed because the simulated history is empty
  // beyond the current page.
  const btn: CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: CHROME_TOKENS.fg,
    background: 'transparent',
  };
  return (
    <span style={{ display: 'inline-flex', gap: 2, marginRight: 4 }}>
      <span style={btn}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M10 3 5 8l5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span style={{ ...btn, opacity: 0.35 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M6 3 11 8l-5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span style={btn}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M13 8a5 5 0 1 1-1.46-3.54L13 6m0-3v3h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
}

function UrlBar({ domain }: { domain: string }) {
  // Chrome 124+ URL pill: large radius, soft tonal background, no
  // visible border on the resting state. The secure indicator on the
  // leading edge is a small "tune" / settings glyph rather than the
  // legacy padlock — Chrome dropped the padlock in late 2023.
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        height: 30,
        minWidth: 320,
        flex: 1,
        padding: '0 14px',
        background: CHROME_TOKENS.urlPillBg,
        border: `1px solid ${CHROME_TOKENS.urlPillBorder}`,
        borderRadius: 16,
        fontSize: 13,
        color: CHROME_TOKENS.fg,
      }}
    >
      <SecureIndicator />
      <span
        style={{
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        <span style={{ color: CHROME_TOKENS.fgMuted }}>https://</span>
        <span style={{ fontWeight: 400 }}>{domain}</span>
      </span>
      <BookmarkStarIcon />
    </div>
  );
}

function SecureIndicator() {
  // Chrome's "tune sliders" connection-info icon (the replacement for
  // the legacy padlock). Drawn as two horizontal rails with offset
  // handles so it reads as a settings dial.
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden="true"
      style={{ color: CHROME_TOKENS.fgMuted, flex: '0 0 auto' }}
    >
      <path
        d="M2 4.5h6M2 9.5h2M10 9.5h2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle
        cx="10"
        cy="4.5"
        r="1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle
        cx="6"
        cy="9.5"
        r="1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function BookmarkStarIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden="true"
      style={{ color: CHROME_TOKENS.fgMuted, flex: '0 0 auto' }}
    >
      <path
        d="M7 1.6 8.6 5l3.6.5-2.6 2.5.6 3.6L7 9.9 3.8 11.6l.6-3.6L1.8 5.5 5.4 5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ToolbarTrailing() {
  // Per the latest design reference the trailing edge is intentionally
  // sparse — one "extensions" puzzle-piece glyph is enough to read as
  // Chrome without crowding the toolbar. The profile circle lives in
  // the tab strip (top-right), not here.
  const btn: CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: CHROME_TOKENS.fg,
    marginLeft: 4,
  };
  return (
    <span style={btn}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M6 2.5h2a1 1 0 0 1 1 1V5h1.5a1.5 1.5 0 0 1 0 3H9v1.5a1 1 0 0 0 1 1H11a1.5 1.5 0 0 1 1.5 1.5V13a.5.5 0 0 1-.5.5H8.5a1 1 0 0 1-1-1V11A1.5 1.5 0 0 0 6 9.5H4.5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1H5V3.5a1 1 0 0 1 1-1Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function ChromeTab({ title, active }: { title: string; active: boolean }) {
  // A Chrome tab is a rounded-top trapezoid: top corners curve inward
  // into the tab strip while the bottom corners curve OUTWARD into the
  // toolbar surface (the "tab notch"). We approximate this with two
  // small radial-gradient pseudo-elements painted as siblings, but
  // since we can't use pseudo-elements with inline styles easily, the
  // version below uses a simple rounded rectangle with the same
  // surface colour as the toolbar — close enough at the size we
  // render, and reads as a real Chrome tab.
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 30,
        padding: '0 12px',
        borderRadius: '10px 10px 0 0',
        background: active ? CHROME_TOKENS.surfaceBg : 'transparent',
        fontSize: 12,
        color: CHROME_TOKENS.fg,
        maxWidth: 240,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        alignSelf: 'flex-end',
        position: 'relative',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="4.2" fill="#0e639c" opacity="0.85" />
      </svg>
      <span
        style={{
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </span>
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: CHROME_TOKENS.fgMuted,
          flex: '0 0 auto',
        }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
          <path
            d="M1.5 1.5 6.5 6.5M6.5 1.5 1.5 6.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </div>
  );
}

function NewTabButton() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 26,
        height: 26,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: CHROME_TOKENS.fgMuted,
        alignSelf: 'center',
        marginLeft: 2,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <path
          d="M7 2.5v9M2.5 7h9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function ProfileDot() {
  // Single small circular avatar on the trailing edge of the tab strip.
  // Drawn flat (no inner letter) so it reads as a profile placeholder
  // at any size without needing an extra glyph.
  return (
    <span
      aria-hidden="true"
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: CHROME_TOKENS.profileBg,
        alignSelf: 'center',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
      }}
    />
  );
}
