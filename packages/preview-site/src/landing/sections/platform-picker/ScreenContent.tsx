import { memo } from 'react';

import type { DevicePlatform } from '@/shell/device-shell';

import { DesktopScreenContent } from './screen-content/DesktopScreenContent';
import { MobileScreenContent } from './screen-content/MobileScreenContent';
import { WebScreenContent } from './screen-content/WebScreenContent';

export const ScreenContent = memo(function ScreenContent({
  eyebrow,
  title,
  desc,
  bullets,
  platform,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  bullets: ReadonlyArray<string>;
  platform: DevicePlatform;
}) {
  if (platform === 'mobile') {
    return <MobileScreenContent eyebrow={eyebrow} title={title} desc={desc} bullets={bullets} />;
  }
  if (platform === 'desktop') {
    return <DesktopScreenContent title={title} desc={desc} bullets={bullets} />;
  }
  return <WebScreenContent eyebrow={eyebrow} title={title} desc={desc} bullets={bullets} />;
});
