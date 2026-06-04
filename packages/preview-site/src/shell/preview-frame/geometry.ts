import type { DevicePlatform } from '../device-shell';
import { MOBILE_SCREEN, DESKTOP_SCREEN, PHONE_GEOMETRY } from '../device-shell/types';
import { TITLE_BAR_HEIGHT } from '../device-shell/DesktopShell';
import { CHROME_TAB_BAR_HEIGHT, CHROME_TOOLBAR_HEIGHT } from '../device-shell/WebShell';
import type { FrameSize } from '../store';

const KNOWN_PLATFORMS: ReadonlySet<DevicePlatform> = new Set([
  'web',
  'desktop',
  'mobile',
]);

/**
 * Coerce the param-store's free-form `platform` string into the union
 * `DeviceShell` expects. Anything unknown falls back to `web` so the
 * shell still renders something sensible — the schema's coercion guard
 * already filters bad values out of the URL, but we double-check here
 * because the playground sometimes hot-loads a stored state from a
 * previous session that pre-dates today's enum.
 */
export function coercePlatform(raw: string): DevicePlatform {
  return KNOWN_PLATFORMS.has(raw as DevicePlatform)
    ? (raw as DevicePlatform)
    : 'web';
}

/**
 * Outer padding around the device shell so it doesn't sit flush against
 * the pane edges. iPhone-style chrome casts the most prominent shadow
 * and benefits from a touch more breathing room.
 *
 * Mobile viewports (≤ 640px) get tighter padding because every pixel
 * the chrome eats is a pixel the simulated device screen loses — at
 * 360px viewport width, a 24px gutter on each side leaves only 312px
 * for the iPhone mockup that itself wants to render at 375px. We
 * scale down to a 6-8px margin so the device is the dominant
 * citizen and the user actually sees the rendered template.
 */
export function pickShellPadding(platform: DevicePlatform, isMobileViewport: boolean): number {
  if (isMobileViewport) {
    return platform === 'mobile' ? 8 : 6;
  }
  return platform === 'mobile' ? 24 : 16;
}

export function getShellNaturalSize(platform: DevicePlatform, size: FrameSize): { width: number; height: number } {
  if (platform === 'mobile') {
    const screen = MOBILE_SCREEN[size];
    const geo = PHONE_GEOMETRY[size];
    // MobileShell uses content-box with padding:bezel, so rendered size
    // = (screen + bezel*2) [content] + bezel*2 [padding]
    return {
      width: screen.width + geo.bezel * 4,
      height: screen.height + geo.bezel * 4,
    };
  }
  const screen = DESKTOP_SCREEN[size];
  if (platform === 'desktop') {
    return { width: screen.width, height: screen.height + TITLE_BAR_HEIGHT };
  }
  return { width: screen.width, height: screen.height + CHROME_TAB_BAR_HEIGHT + CHROME_TOOLBAR_HEIGHT };
}
