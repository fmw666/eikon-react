/**
 * @file DeviceShell.tsx
 * @description Apple-styled "device chrome" wrapping the preview iframe.
 *
 * Three platform-specific shells:
 *
 *   - MobileShell  → iPhone 14 Pro-shaped body with the Dynamic Island,
 *                    a faux status bar (9:41 / signal / wifi / battery),
 *                    and a home indicator at the bottom.
 *   - DesktopShell → macOS Sequoia window with traffic lights in the
 *                    top-left and a centred title.
 *   - WebShell     → Safari (macOS) chrome — traffic lights, back/
 *                    forward/reload buttons, and a pill-shaped URL bar
 *                    showing the previewed app's "domain".
 *
 * All three are pure presentation: nothing here drives the iframe's src,
 * its build state, or any cache key. The shell is sized via the
 * `FrameSize` preset (`small | standard | large`) which corresponds to
 * real reference devices (iPhone SE / 14P / Pro Max for mobile; laptop /
 * desktop / monitor for desktop+web).
 *
 * The iframe is rendered as `children` so PreviewFrame stays in charge
 * of its own ref, src, and reload-key — DeviceShell only wraps it in
 * the right chrome and exposes a `screenStyle` argument the consumer
 * applies to its iframe (`borderRadius` + correct `width/height: 100%`).
 *
 * Extra `padding` is reserved INSIDE the screen on mobile so the
 * decorative status bar and home indicator don't visually overlap the
 * iframe content. We rely on the previewed app's own `safe-area-inset-*`
 * padding (added to `index.html`'s `<meta viewport-fit=cover>` and the
 * mobile layouts) to keep its content clear of those strips when the
 * shell happens to render on a real phone — but in the playground, the
 * iframe is just a regular `<iframe>` without safe-area context, so we
 * carve the space here instead.
 */

// =================================================================================================
// Imports
// =================================================================================================

import type { CSSProperties, ReactNode } from 'react';

import type { FrameSize } from './store';

// =================================================================================================
// Types
// =================================================================================================

export type DevicePlatform = 'web' | 'desktop' | 'mobile';

interface DeviceShellProps {
  /** Drives which Apple chrome wraps the iframe. */
  readonly platform: DevicePlatform;
  /** Size preset (S / M / L) — picks a reference-device dimension. */
  readonly size: FrameSize;
  /** Title shown in DesktopShell's title bar / WebShell's tab. */
  readonly title?: string;
  /** "Domain" rendered in WebShell's URL bar. */
  readonly domain?: string;
  /**
   * Render-prop receives the inline style the consumer should apply to
   * its iframe so that the iframe inherits the chrome's `screenRadius`
   * and stretches to fill the inner stage. Returning a plain `<iframe>`
   * with this style works out of the box.
   */
  readonly children: (screenStyle: CSSProperties) => ReactNode;
}

// =================================================================================================
// Size tables
// =================================================================================================

interface ScreenDims {
  readonly width: number;
  readonly height: number;
}

const MOBILE_SCREEN: Record<FrameSize, ScreenDims> = {
  small: { width: 375, height: 667 },
  standard: { width: 390, height: 844 },
  large: { width: 430, height: 932 },
};

const DESKTOP_SCREEN: Record<FrameSize, ScreenDims> = {
  small: { width: 1024, height: 640 },
  standard: { width: 1280, height: 800 },
  large: { width: 1440, height: 900 },
};

// =================================================================================================
// Common style tokens — the three chromes share the same Apple-ish palette
// =================================================================================================

const APPLE_TOKENS = {
  bodyDark: '#0a0a0a',
  trafficClose: '#ff5f57',
  trafficMin: '#febc2e',
  trafficMax: '#28c840',
  trafficStroke: 'rgba(0,0,0,0.18)',
  windowBorder: 'rgba(0,0,0,0.18)',
  titleBarBg: 'linear-gradient(180deg, #f0f0f0 0%, #d6d6d6 100%)',
  titleBarBgDark: 'linear-gradient(180deg, #2c2c2e 0%, #1c1c1e 100%)',
  titleColor: '#1d1d1f',
  titleColorDark: '#f5f5f7',
  urlBarBg: '#fff',
  urlBarBorder: '#e5e5ea',
  urlBarTextSecondary: '#86868b',
  urlBarTextPrimary: '#1d1d1f',
  bodyShadow:
    '0 1px 2px rgba(0,0,0,0.04), 0 24px 48px -12px rgba(0,0,0,0.25), 0 8px 16px -8px rgba(0,0,0,0.18)',
} as const;

const PHONE_TOKENS = {
  body: '#0c0c0c',
  rim: '#1f1f22',
  islandBg: '#000',
  statusFg: '#fff',
  homeIndicator: 'rgba(255,255,255,0.92)',
  bodyShadow:
    '0 1px 2px rgba(0,0,0,0.06), 0 30px 60px -15px rgba(0,0,0,0.45), 0 12px 30px -10px rgba(0,0,0,0.25)',
} as const;

// =================================================================================================
// Public component
// =================================================================================================

export function DeviceShell({
  platform,
  size,
  title = 'Eikon Preview',
  domain = 'eikon-react.preview',
  children,
}: DeviceShellProps) {
  if (platform === 'mobile') {
    return <MobileShell size={size}>{children}</MobileShell>;
  }
  if (platform === 'desktop') {
    return (
      <DesktopShell size={size} title={title}>
        {children}
      </DesktopShell>
    );
  }
  return (
    <WebShell size={size} title={title} domain={domain}>
      {children}
    </WebShell>
  );
}

// =================================================================================================
// MobileShell — iPhone 14 Pro shape
// =================================================================================================

/**
 * Geometry constants for the phone body. Bezel and corner radius scale
 * very slightly with size — Pro Max bodies physically have a touch more
 * border than the SE — but the differences are subtle on screen so the
 * deltas here are conservative (real devices are within 1-2pt of each
 * other in CSS-pixel terms).
 */
const PHONE_GEOMETRY: Record<FrameSize, {
  bezel: number;
  cornerRadius: number;
  islandWidth: number;
  islandHeight: number;
}> = {
  small: { bezel: 10, cornerRadius: 38, islandWidth: 0, islandHeight: 0 },
  standard: { bezel: 10, cornerRadius: 48, islandWidth: 120, islandHeight: 34 },
  large: { bezel: 11, cornerRadius: 52, islandWidth: 130, islandHeight: 36 },
};

const STATUS_BAR_HEIGHT = 44;
const HOME_INDICATOR_AREA = 28;

function MobileShell({
  size,
  children,
}: {
  size: FrameSize;
  children: DeviceShellProps['children'];
}) {
  const screen = MOBILE_SCREEN[size];
  const geo = PHONE_GEOMETRY[size];
  const innerRadius = Math.max(geo.cornerRadius - geo.bezel, 18);

  // Outer body wraps a bezel + screen. The status bar and home indicator
  // are absolutely positioned over the screen, in the area we reserve via
  // the iframe's top/bottom padding (carved out of the screen, NOT the
  // bezel — the screen still maps 1-for-1 onto the reference device's
  // logical resolution, with the chrome borrowing a bit of it the way a
  // real iPhone borrows pixels for the Dynamic Island and home indicator).
  return (
    <div
      style={{
        position: 'relative',
        width: screen.width + geo.bezel * 2,
        height: screen.height + geo.bezel * 2,
        maxWidth: '100%',
        maxHeight: '100%',
        background: PHONE_TOKENS.body,
        borderRadius: geo.cornerRadius,
        boxShadow: PHONE_TOKENS.bodyShadow,
        padding: geo.bezel,
        flex: '0 0 auto',
        // Subtle inner ring — gives the bezel a "tempered aluminium" edge.
        outline: `1px solid ${PHONE_TOKENS.rim}`,
        outlineOffset: -1,
      }}
      role="img"
      aria-label="iPhone preview"
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: innerRadius,
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        {/* iframe occupies the full screen area; status-bar / home-indicator
            overlays sit on top.  Reserving 44px / 28px of inner padding via
            the screenStyle keeps the previewed app's content from being
            obscured by the decorative chrome. */}
        {children({
          width: '100%',
          height: '100%',
          border: 0,
          borderRadius: 0,
          background: '#fff',
          paddingTop: STATUS_BAR_HEIGHT,
          paddingBottom: HOME_INDICATOR_AREA,
          boxSizing: 'border-box',
        })}

        {/* Status bar overlay */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: STATUS_BAR_HEIGHT,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            padding: '0 24px 6px 24px',
            color: PHONE_TOKENS.statusFg,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 0.2,
            // Dark-on-light is unreadable; we draw the status text in
            // black if the previewed app is using a light theme. Without
            // crossing the iframe boundary we have no way to know —
            // default to white because dark mode is the most flattering
            // demo for a marketing screenshot, and the SE layout (which
            // doesn't have an island) skips this overlay entirely below.
            mixBlendMode: 'difference',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          <span>9:41</span>
          <StatusBarIcons />
        </div>

        {/* Dynamic Island — only on standard / large; SE doesn't have one. */}
        {geo.islandWidth > 0 && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 10,
              left: '50%',
              transform: 'translateX(-50%)',
              width: geo.islandWidth,
              height: geo.islandHeight,
              borderRadius: geo.islandHeight / 2,
              background: PHONE_TOKENS.islandBg,
              boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset',
              pointerEvents: 'none',
              zIndex: 3,
            }}
          />
        )}

        {/* Home indicator */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 134,
            height: 5,
            borderRadius: 2.5,
            background: PHONE_TOKENS.homeIndicator,
            mixBlendMode: 'difference',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      </div>
    </div>
  );
}

function StatusBarIcons() {
  // Three glyphs: signal bars, wifi, battery. Drawn as inline SVG so
  // they scale crisply at any DPR and never need an external font.
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <svg
        width="18"
        height="11"
        viewBox="0 0 18 11"
        fill="currentColor"
        aria-hidden="true"
      >
        <rect x="0" y="7" width="3" height="4" rx="0.6" />
        <rect x="5" y="5" width="3" height="6" rx="0.6" />
        <rect x="10" y="2" width="3" height="9" rx="0.6" />
        <rect x="15" y="0" width="3" height="11" rx="0.6" />
      </svg>
      <svg width="16" height="11" viewBox="0 0 16 11" aria-hidden="true">
        <path
          d="M8 9.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Zm0-3.4a3.6 3.6 0 0 1 2.55 1.05.7.7 0 0 0 .99-.99A5 5 0 0 0 8 4.4a5 5 0 0 0-3.54 1.46.7.7 0 0 0 .99.99A3.6 3.6 0 0 1 8 5.8Zm0-3.4a7 7 0 0 1 4.95 2.05.7.7 0 0 0 .99-.99A8.4 8.4 0 0 0 8 1a8.4 8.4 0 0 0-5.94 2.46.7.7 0 0 0 .99.99A7 7 0 0 1 8 2.4Z"
          fill="currentColor"
        />
      </svg>
      <span
        style={{
          position: 'relative',
          width: 26,
          height: 12,
          border: '1.2px solid currentColor',
          borderRadius: 3,
          opacity: 0.95,
        }}
      >
        <span
          style={{
            position: 'absolute',
            right: -3,
            top: 3,
            bottom: 3,
            width: 1.5,
            background: 'currentColor',
            borderRadius: 1,
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: 1.5,
            background: 'currentColor',
            borderRadius: 1.5,
          }}
        />
      </span>
    </span>
  );
}

// =================================================================================================
// DesktopShell — macOS Sequoia window
// =================================================================================================

const TITLE_BAR_HEIGHT = 28;

function DesktopShell({
  size,
  title,
  children,
}: {
  size: FrameSize;
  title: string;
  children: DeviceShellProps['children'];
}) {
  const screen = DESKTOP_SCREEN[size];
  const radius = 12;

  return (
    <div
      style={{
        position: 'relative',
        width: screen.width,
        height: screen.height + TITLE_BAR_HEIGHT,
        maxWidth: '100%',
        maxHeight: '100%',
        background: '#fff',
        borderRadius: radius,
        boxShadow: APPLE_TOKENS.bodyShadow,
        border: `1px solid ${APPLE_TOKENS.windowBorder}`,
        overflow: 'hidden',
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
      }}
      role="img"
      aria-label="macOS window preview"
    >
      <TitleBar title={title} />
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

function TitleBar({ title }: { title: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        height: TITLE_BAR_HEIGHT,
        background: APPLE_TOKENS.titleBarBg,
        borderBottom: `1px solid ${APPLE_TOKENS.windowBorder}`,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 12px',
        userSelect: 'none',
      }}
    >
      <TrafficLights />
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: APPLE_TOKENS.titleColor,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </div>
      <span />
    </div>
  );
}

function TrafficLights() {
  // Three real-shaped traffic-light buttons. We don't wire them to any
  // window-management action — the playground's window IS the parent —
  // but we draw them so the chrome reads as a real macOS title bar at
  // a glance. Slight inner shadow + border gives the dot a tactile feel.
  const dot = (color: string): CSSProperties => ({
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: color,
    border: `0.5px solid ${APPLE_TOKENS.trafficStroke}`,
    boxShadow: '0 0 0 0.5px rgba(0,0,0,0.04) inset',
  });
  return (
    <span style={{ display: 'inline-flex', gap: 8 }}>
      <span style={dot(APPLE_TOKENS.trafficClose)} />
      <span style={dot(APPLE_TOKENS.trafficMin)} />
      <span style={dot(APPLE_TOKENS.trafficMax)} />
    </span>
  );
}

// =================================================================================================
// WebShell — Safari (macOS) chrome
// =================================================================================================

const SAFARI_TOOLBAR_HEIGHT = 44;
const SAFARI_TAB_BAR_HEIGHT = 30;

function WebShell({
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
  const totalChrome = SAFARI_TOOLBAR_HEIGHT + SAFARI_TAB_BAR_HEIGHT;

  return (
    <div
      style={{
        position: 'relative',
        width: screen.width,
        height: screen.height + totalChrome,
        maxWidth: '100%',
        maxHeight: '100%',
        background: '#fff',
        borderRadius: radius,
        boxShadow: APPLE_TOKENS.bodyShadow,
        border: `1px solid ${APPLE_TOKENS.windowBorder}`,
        overflow: 'hidden',
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
      }}
      role="img"
      aria-label="Safari browser preview"
    >
      <SafariTopChrome domain={domain} title={title} />
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

function SafariTopChrome({
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
        background: APPLE_TOKENS.titleBarBg,
        borderBottom: `1px solid ${APPLE_TOKENS.windowBorder}`,
        userSelect: 'none',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
      }}
    >
      {/* Toolbar row: traffic lights + nav buttons + URL bar */}
      <div
        style={{
          height: SAFARI_TOOLBAR_HEIGHT,
          display: 'grid',
          gridTemplateColumns: 'auto auto 1fr auto',
          alignItems: 'center',
          gap: 12,
          padding: '0 12px',
        }}
      >
        <TrafficLights />
        <NavButtonRow />
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <UrlBar domain={domain} />
        </div>
        <ToolbarTrailing />
      </div>
      {/* Tab bar row */}
      <div
        style={{
          height: SAFARI_TAB_BAR_HEIGHT,
          display: 'flex',
          alignItems: 'flex-end',
          padding: '0 8px',
          borderTop: `1px solid ${APPLE_TOKENS.windowBorder}`,
          background: 'rgba(255,255,255,0.4)',
        }}
      >
        <SafariTab title={title} active />
        <span style={{ flex: 1 }} />
      </div>
    </div>
  );
}

function NavButtonRow() {
  // Back / forward / share / sidebar — drawn as flat outline icons
  // matching the Safari 17+ minimalist toolbar. Plumbing the real
  // back/forward to iframe history would be a nice future touch but
  // out of scope for purely-visual chrome.
  const btn: CSSProperties = {
    width: 26,
    height: 26,
    borderRadius: 6,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#3a3a3c',
    background: 'transparent',
  };
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      <span style={btn}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path
            d="M9 2 4 7l5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span style={{ ...btn, opacity: 0.45 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path
            d="m5 2 5 5-5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
}

function UrlBar({ domain }: { domain: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 28,
        minWidth: 320,
        maxWidth: 560,
        flex: 1,
        padding: '0 12px',
        background: APPLE_TOKENS.urlBarBg,
        border: `1px solid ${APPLE_TOKENS.urlBarBorder}`,
        borderRadius: 7,
        fontSize: 12,
        color: APPLE_TOKENS.urlBarTextPrimary,
        boxShadow: '0 1px 0 rgba(0,0,0,0.02) inset',
      }}
    >
      <svg width="11" height="13" viewBox="0 0 11 13" aria-hidden="true">
        <path
          d="M2 5.5V4a3.5 3.5 0 1 1 7 0v1.5"
          fill="none"
          stroke={APPLE_TOKENS.urlBarTextSecondary}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <rect
          x="1"
          y="5.5"
          width="9"
          height="6.5"
          rx="1.3"
          fill={APPLE_TOKENS.urlBarTextSecondary}
        />
      </svg>
      <span style={{ color: APPLE_TOKENS.urlBarTextSecondary }}>https://</span>
      <span style={{ fontWeight: 500 }}>{domain}</span>
      <span style={{ flex: 1 }} />
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <path
          d="M11 7a4 4 0 1 1-1.17-2.83l1.67-1.67M11 2.5V5h-2.5"
          fill="none"
          stroke={APPLE_TOKENS.urlBarTextSecondary}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function ToolbarTrailing() {
  // Share + tabs icons on the trailing edge of the toolbar.
  const btn: CSSProperties = {
    width: 26,
    height: 26,
    borderRadius: 6,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#3a3a3c',
  };
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      <span style={btn}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path
            d="M7 1.5v8M7 1.5 4.5 4M7 1.5 9.5 4M2.5 8v3a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span style={btn}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <rect
            x="1.5"
            y="2.5"
            width="11"
            height="9"
            rx="1.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M1.5 5.5h11"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </span>
  );
}

function SafariTab({ title, active }: { title: string; active: boolean }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 24,
        padding: '0 12px',
        borderRadius: '6px 6px 0 0',
        background: active ? '#fafafa' : 'transparent',
        border: active ? `1px solid ${APPLE_TOKENS.windowBorder}` : 'none',
        borderBottom: 'none',
        fontSize: 11,
        color: APPLE_TOKENS.titleColor,
        maxWidth: 240,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        alignSelf: 'flex-end',
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <circle cx="5" cy="5" r="3.5" fill="#0e639c" opacity="0.85" />
      </svg>
      <span style={{ fontWeight: 500 }}>{title}</span>
    </div>
  );
}
