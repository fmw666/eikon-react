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
 *   - WebShell     → Chrome (macOS) chrome — tab strip with traffic
 *                    lights + active tab + new-tab button on top, and
 *                    a back/forward/reload toolbar with a pill-shaped
 *                    URL bar showing the previewed app's "domain"
 *                    underneath.
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

/**
 * iPhone 15/16 Pro-flavoured token palette. The frame reads as a single
 * piece of brushed dark titanium rather than the old multi-ringed
 * gasket — closer to the real Pro chassis and to the reference mock
 * provided for this redesign.
 *
 * Two visual elements compose the frame:
 *
 *   1. `bodyGradient` — a vertical, near-monochrome gradient on the
 *                       outer body. Top is a touch lighter (catches
 *                       light from above), bottom is a touch deeper.
 *                       Painted as `background` on the body div.
 *   2. `screen border` — a hairline (0.5px) ring of `screenBorder`
 *                       around the inner screen, painted as a
 *                       1px `outline`. This is the only seam between
 *                       glass and titanium and is intentionally subtle.
 *
 * Highlights are layered on top via two thin gradient strips (top edge
 * + left/right side sheens) rather than baked into the body, so they
 * can be tuned independently without disturbing the base colour.
 */
const PHONE_TOKENS = {
  bodyTop: '#3a3d44',          // brushed dark titanium top edge
  bodyMid: '#26282d',          // mid-section, slightly cooler
  bodyBottom: '#1a1c20',       // bottom edge, deeper for grounding
  screenBorder: 'rgba(0,0,0,0.85)',
  edgeHighlight: 'rgba(255,255,255,0.32)',
  edgeShadow: 'rgba(0,0,0,0.55)',
  button: '#2b2d32',           // mute / volume / power keys
  buttonHighlight: 'rgba(255,255,255,0.18)',
  islandBg: '#000',
  statusFg: '#fff',
  homeIndicator: 'rgba(255,255,255,0.95)',
  bodyShadow:
    '0 1px 2px rgba(0,0,0,0.06), 0 36px 72px -18px rgba(0,0,0,0.55), 0 16px 36px -12px rgba(0,0,0,0.3)',
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
 * Geometry constants for the phone body, tuned to match a real
 * iPhone 15/16 Pro silhouette: a narrow, uniform titanium frame
 * (~10-12 CSS px on the long edges), large outer corner radius, and
 * a Dynamic Island that's noticeably WIDER than it is tall.
 *
 * `bezel` is the visible titanium frame thickness around the screen.
 * It's deliberately thinner than the previous design (10-12 vs 16-18)
 * because the new shell paints the frame as a single piece — no
 * concentric gasket rings — so the optical weight reads correctly
 * at half the px.
 *
 * `innerGap` reserves a tiny dark seam between the titanium frame and
 * the glass screen, mirroring the real device's black inner border.
 * Without it the screen content would butt directly against the
 * titanium and lose the "screen sits BENEATH the frame" effect.
 *
 * `islandTop` puts the Dynamic Island ~10 CSS px below the inner
 * screen's top edge, which is how the real device positions it.
 *
 * Side-button positions are still expressed as percentages of body
 * height so they read sensibly across all three size presets.
 */
interface PhoneGeometry {
  readonly bezel: number;
  readonly innerGap: number;
  readonly cornerRadius: number;
  readonly islandWidth: number;
  readonly islandHeight: number;
  readonly islandTop: number;
  readonly buttons: {
    readonly thickness: number;
    readonly muteHeight: number;
    readonly volumeHeight: number;
    readonly powerHeight: number;
    readonly muteTopPct: number;
    readonly volumeUpTopPct: number;
    readonly volumeDownTopPct: number;
    readonly powerTopPct: number;
  };
}

const PHONE_GEOMETRY: Record<FrameSize, PhoneGeometry> = {
  small: {
    bezel: 10,
    innerGap: 2,
    cornerRadius: 42,
    islandWidth: 0,
    islandHeight: 0,
    islandTop: 0,
    buttons: {
      thickness: 3,
      muteHeight: 22,
      volumeHeight: 44,
      powerHeight: 64,
      muteTopPct: 0.10,
      volumeUpTopPct: 0.17,
      volumeDownTopPct: 0.25,
      powerTopPct: 0.13,
    },
  },
  standard: {
    bezel: 11,
    innerGap: 2,
    cornerRadius: 52,
    islandWidth: 118,
    islandHeight: 34,
    islandTop: 10,
    buttons: {
      thickness: 3,
      muteHeight: 26,
      volumeHeight: 58,
      powerHeight: 92,
      muteTopPct: 0.11,
      volumeUpTopPct: 0.18,
      volumeDownTopPct: 0.27,
      powerTopPct: 0.22,
    },
  },
  large: {
    bezel: 12,
    innerGap: 2,
    cornerRadius: 56,
    islandWidth: 126,
    islandHeight: 36,
    islandTop: 11,
    buttons: {
      thickness: 3,
      muteHeight: 28,
      volumeHeight: 62,
      powerHeight: 98,
      muteTopPct: 0.11,
      volumeUpTopPct: 0.18,
      volumeDownTopPct: 0.27,
      powerTopPct: 0.22,
    },
  },
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
  // The visible padding between titanium frame and screen content is
  // `bezel`. We also reserve a 2px dark seam (`innerGap`) inside that
  // padding so the screen reads as glass beneath the frame.
  const innerRadius = Math.max(geo.cornerRadius - geo.bezel, 18);
  const outerWidth = screen.width + geo.bezel * 2;
  const outerHeight = screen.height + geo.bezel * 2;

  // The body div is a single piece of "titanium": a vertical 3-stop
  // gradient with a 1px outer highlight on top and a 1px outer shadow
  // on the bottom. No nested gasket rings — closer to the real Pro
  // chassis (and to the reference mock).
  return (
    <div
      style={{
        position: 'relative',
        width: outerWidth,
        height: outerHeight,
        maxWidth: '100%',
        maxHeight: '100%',
        background: `linear-gradient(180deg, ${PHONE_TOKENS.bodyTop} 0%, ${PHONE_TOKENS.bodyMid} 45%, ${PHONE_TOKENS.bodyBottom} 100%)`,
        borderRadius: geo.cornerRadius,
        boxShadow: [
          `inset 0 1px 0 ${PHONE_TOKENS.edgeHighlight}`,
          `inset 0 -1px 0 ${PHONE_TOKENS.edgeShadow}`,
          PHONE_TOKENS.bodyShadow,
        ].join(', '),
        padding: geo.bezel,
        flex: '0 0 auto',
        boxSizing: 'content-box',
      }}
      role="img"
      aria-label="iPhone preview"
    >
      {/* Top crown highlight — a short, soft gradient line tucked just
          inside the top edge to suggest light catching the polished
          titanium chamfer. Stops short of the corners where the curve
          would refract differently. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 1,
          left: geo.cornerRadius * 0.5,
          right: geo.cornerRadius * 0.5,
          height: 1,
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 4,
        }}
      />
      {/* Left & right side sheens — narrow vertical gradients that
          give the frame a subtle "brushed" feel without darkening the
          screen area. Painted as siblings of the screen so they're
          rendered over the body gradient but under the screen border. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: geo.cornerRadius * 0.5,
          bottom: geo.cornerRadius * 0.5,
          left: 0,
          width: 1,
          background:
            'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.18) 40%, rgba(255,255,255,0.18) 60%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 4,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: geo.cornerRadius * 0.5,
          bottom: geo.cornerRadius * 0.5,
          right: 0,
          width: 1,
          background:
            'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.12) 40%, rgba(255,255,255,0.12) 60%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 4,
        }}
      />

      <SideButton
        geo={geo}
        side="left"
        topPct={geo.buttons.muteTopPct}
        height={geo.buttons.muteHeight}
      />
      <SideButton
        geo={geo}
        side="left"
        topPct={geo.buttons.volumeUpTopPct}
        height={geo.buttons.volumeHeight}
      />
      <SideButton
        geo={geo}
        side="left"
        topPct={geo.buttons.volumeDownTopPct}
        height={geo.buttons.volumeHeight}
      />
      <SideButton
        geo={geo}
        side="right"
        topPct={geo.buttons.powerTopPct}
        height={geo.buttons.powerHeight}
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: innerRadius,
          overflow: 'hidden',
          background: '#000',
          boxShadow: [
            `0 0 0 ${geo.innerGap}px #000`,
            `inset 0 0 0 1px ${PHONE_TOKENS.screenBorder}`,
          ].join(', '),
        }}
      >
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

        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: STATUS_BAR_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            // Left/right padding pushes the time and icons clear of the
            // Dynamic Island. The island lives at ~50% width centred, so
            // 24px gives them room to breathe without overlapping.
            padding: '14px 26px 0 26px',
            color: PHONE_TOKENS.statusFg,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: -0.1,
            // Status bar text uses difference-blend so it stays legible
            // over both light and dark previewed content without us
            // having to peek into the iframe.
            mixBlendMode: 'difference',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          <span>9:41</span>
          <StatusBarIcons />
        </div>

        {geo.islandWidth > 0 && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: geo.islandTop,
              left: '50%',
              transform: 'translateX(-50%)',
              width: geo.islandWidth,
              height: geo.islandHeight,
              borderRadius: geo.islandHeight / 2,
              background: PHONE_TOKENS.islandBg,
              boxShadow: [
                'inset 0 1px 0 rgba(255,255,255,0.04)',
                'inset 0 -1px 0 rgba(0,0,0,0.3)',
                '0 0 0 1px rgba(0,0,0,0.6)',
              ].join(', '),
              pointerEvents: 'none',
              zIndex: 3,
            }}
          />
        )}

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

/**
 * Single side-button on the iPhone body — mute / volume / power. Drawn
 * as a thin rounded bar sitting just OUTSIDE the body's left/right
 * edge by 2 px so it reads as a discrete machined key rather than an
 * etch in the frame.
 *
 * Each key paints two highlights: a vertical gradient on the body
 * (slightly darker than the chassis to suggest a separate piece of
 * metal) and a 1 px outer ring on the side that faces away from the
 * body (the "lit" edge of the key).
 *
 * `topPct` positions the key as a fraction of the body height, so the
 * same numbers work across the three size presets without re-tuning.
 */
function SideButton({
  geo,
  side,
  topPct,
  height,
}: {
  geo: PhoneGeometry;
  side: 'left' | 'right';
  topPct: number;
  height: number;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        [side]: -2,
        top: `${topPct * 100}%`,
        width: geo.buttons.thickness,
        height,
        background: `linear-gradient(180deg, #34363b 0%, ${PHONE_TOKENS.button} 50%, #1c1e22 100%)`,
        borderRadius:
          side === 'left' ? '1.5px 0 0 1.5px' : '0 1.5px 1.5px 0',
        boxShadow: [
          side === 'left'
            ? `inset -1px 0 0 rgba(0,0,0,0.4)`
            : `inset 1px 0 0 rgba(0,0,0,0.4)`,
          side === 'left'
            ? `-1px 0 0 ${PHONE_TOKENS.buttonHighlight}`
            : `1px 0 0 ${PHONE_TOKENS.buttonHighlight}`,
        ].join(', '),
        zIndex: 1,
      }}
    />
  );
}

function StatusBarIcons() {
  // Three glyphs: signal bars, wifi, battery. Drawn as inline SVG so
  // they scale crisply at any DPR and never need an external font.
  // Sizes/spacing tuned to match the iOS 17+ status bar (slightly
  // tighter than the previous design — gap shrunk from 6 to 5 px and
  // the battery is now 24 × 11 to match a real device).
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <svg
        width="17"
        height="10"
        viewBox="0 0 17 10"
        fill="currentColor"
        aria-hidden="true"
      >
        <rect x="0" y="6" width="3" height="4" rx="0.8" />
        <rect x="4.5" y="4" width="3" height="6" rx="0.8" />
        <rect x="9" y="2" width="3" height="8" rx="0.8" />
        <rect x="13.5" y="0" width="3" height="10" rx="0.8" />
      </svg>
      <svg width="15" height="10" viewBox="0 0 15 10" aria-hidden="true">
        <path
          d="M7.5 8.4a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm0-3.2a3.4 3.4 0 0 1 2.4 1 .65.65 0 0 0 .92-.92A4.7 4.7 0 0 0 7.5 3.9a4.7 4.7 0 0 0-3.32 1.38.65.65 0 0 0 .92.92A3.4 3.4 0 0 1 7.5 5.2Zm0-3.2a6.6 6.6 0 0 1 4.66 1.92.65.65 0 0 0 .92-.92A7.9 7.9 0 0 0 7.5 0.7 7.9 7.9 0 0 0 1.92 3a.65.65 0 0 0 .92.92A6.6 6.6 0 0 1 7.5 2Z"
          fill="currentColor"
        />
      </svg>
      <span
        style={{
          position: 'relative',
          width: 24,
          height: 11,
          border: '1px solid currentColor',
          borderRadius: 3,
          opacity: 0.6,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: -2.5,
            top: 3,
            bottom: 3,
            width: 1.2,
            background: 'currentColor',
            borderRadius: 0.6,
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 1.2,
            background: 'currentColor',
            borderRadius: 1.5,
            opacity: 0.95,
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
    border: `1px solid ${APPLE_TOKENS.trafficStroke}`,
    boxShadow: '0 0 0 1px rgba(0,0,0,0.04) inset',
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

const CHROME_TAB_BAR_HEIGHT = 36;
const CHROME_TOOLBAR_HEIGHT = 40;

const CHROME_TOKENS = {
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
  const totalChrome = CHROME_TAB_BAR_HEIGHT + CHROME_TOOLBAR_HEIGHT;

  return (
    <div
      style={{
        position: 'relative',
        width: screen.width,
        height: screen.height + totalChrome,
        maxWidth: '100%',
        maxHeight: '100%',
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

function ChromeTopChrome({
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

function NavButtonRow() {
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
