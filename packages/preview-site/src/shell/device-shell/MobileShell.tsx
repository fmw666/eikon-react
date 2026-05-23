import type { FrameSize } from '../store';
import type { DeviceShellProps } from './types';
import { MOBILE_SCREEN } from './types';
import { PHONE_TOKENS } from './tokens';

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
export interface PhoneGeometry {
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

export const PHONE_GEOMETRY: Record<FrameSize, PhoneGeometry> = {
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

export const STATUS_BAR_HEIGHT = 44;
export const HOME_INDICATOR_AREA = 28;

export function MobileShell({
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
        transition: 'width 420ms cubic-bezier(0.16, 1, 0.3, 1), height 420ms cubic-bezier(0.16, 1, 0.3, 1)',
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
export function SideButton({
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

export function StatusBarIcons() {
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
