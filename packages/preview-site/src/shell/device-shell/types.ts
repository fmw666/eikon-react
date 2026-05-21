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
  small: { width: 375, height: 667 },
  standard: { width: 390, height: 844 },
  large: { width: 430, height: 932 },
};

export const DESKTOP_SCREEN: Record<FrameSize, ScreenDims> = {
  small: { width: 1024, height: 640 },
  standard: { width: 1280, height: 800 },
  large: { width: 1440, height: 900 },
};
