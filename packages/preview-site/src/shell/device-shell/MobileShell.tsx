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
    islandWidth: 126,
    islandHeight: 37,
    islandTop: 11,
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
    islandWidth: 138,
    islandHeight: 40,
    islandTop: 7,    buttons: {
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

export const STATUS_BAR_HEIGHT = 54;
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
  const islandCenterY = geo.islandHeight > 0
    ? geo.islandTop + geo.islandHeight / 2
    : STATUS_BAR_HEIGHT / 2;
  const statusPadTop = Math.max(0, 2 * (islandCenterY - STATUS_BAR_HEIGHT / 2));

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
            padding: `${statusPadTop}px 38px 0 38px`,
            color: PHONE_TOKENS.statusFg,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: -0.4,
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
          >
            {/* Front camera lens — right side of island */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                right: geo.islandHeight * 0.32,
                transform: 'translateY(-50%)',
                width: geo.islandHeight * 0.34,
                height: geo.islandHeight * 0.34,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 38% 38%, #1a1d24 0%, #08080a 70%)',
                boxShadow: 'inset 0 0.5px 0.5px rgba(255,255,255,0.08), 0 0 0 0.5px rgba(40,44,52,0.5)',
              }}
            />
          </div>
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
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <svg
        width="20"
        height="13"
        viewBox="0 0 20 13"
        fill="currentColor"
        aria-hidden="true"
      >
        <rect x="0" y="9" width="3.5" height="4" rx="1.2" />
        <rect x="5" y="6" width="3.5" height="7" rx="1.2" />
        <rect x="10" y="3" width="3.5" height="10" rx="1.2" />
        <rect x="15" y="0" width="3.5" height="13" rx="1.2" />
      </svg>
      <svg
        width="17"
        height="13"
        viewBox="0 0 16 12"
        fill="currentColor"
        aria-hidden="true"
      >
        <circle cx="8" cy="10.8" r="1.3" />
        <path d="M8 7.2c1.1 0 2.1.45 2.83 1.17a.75.75 0 1 1-1.06 1.06A2.25 2.25 0 0 0 8 8.7c-.66 0-1.28.26-1.77.73a.75.75 0 1 1-1.06-1.06A3.75 3.75 0 0 1 8 7.2Z" />
        <path d="M8 4c1.93 0 3.68.78 4.95 2.05a.75.75 0 0 1-1.06 1.06A5.25 5.25 0 0 0 8 5.5c-1.52 0-2.87.61-3.89 1.61a.75.75 0 0 1-1.06-1.06A6.75 6.75 0 0 1 8 4Z" />
        <path d="M8 .8c2.76 0 5.26 1.12 7.07 2.93a.75.75 0 0 1-1.06 1.06A8.25 8.25 0 0 0 8 2.3 8.25 8.25 0 0 0 1.99 4.79a.75.75 0 0 1-1.06-1.06A9.75 9.75 0 0 1 8 .8Z" />
      </svg>
      <svg
        width="28"
        height="13"
        viewBox="0 0 28 13"
        aria-hidden="true"
      >
        <rect
          x="0.75"
          y="0.75"
          width="23.5"
          height="11.5"
          rx="3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          opacity="0.5"
        />
        <rect
          x="25.2"
          y="3.8"
          width="2"
          height="5.4"
          rx="1"
          fill="currentColor"
          opacity="0.5"
        />
        <rect
          x="2.5"
          y="2.5"
          width="20"
          height="8"
          rx="2.2"
          fill="currentColor"
          opacity="0.9"
        />
      </svg>
    </span>
  );
}
