import type { CSSProperties, ReactNode } from 'react';

import type { FrameSize } from '../store';

export type DevicePlatform = 'web' | 'desktop' | 'mobile';

export interface DeviceShellProps {
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

export interface ScreenDims {
  readonly width: number;
  readonly height: number;
}

export const MOBILE_SCREEN: Record<FrameSize, ScreenDims> = {
  small: { width: 375, height: 812 },
  standard: { width: 393, height: 852 },
  large: { width: 430, height: 932 },
};

export const DESKTOP_SCREEN: Record<FrameSize, ScreenDims> = {
  small: { width: 1024, height: 640 },
  standard: { width: 1280, height: 800 },
  large: { width: 1440, height: 900 },
};

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
    islandTop: 7,
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
