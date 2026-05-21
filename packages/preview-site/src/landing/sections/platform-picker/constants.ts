import type { ReactNode } from 'react';

import type { Platform } from '@/lib/params-schema';
import type { DevicePlatform } from '@/shell/DeviceShell';

import type { I18nKey } from '../../theme/i18n';

export type StackSlot = 'left' | 'center' | 'right';

export interface PlatformOption {
  value: Platform;
  compactTitleKey: I18nKey;
  compactDescKey: I18nKey;
  titleKey: I18nKey;
  descKey: I18nKey;
  bulletKeys: ReadonlyArray<I18nKey>;
  Icon: (props: { className: string }) => ReactNode;
}

export const SCREEN_DIM_SCRIM = 'rgba(10, 10, 14, 0.58)';
export const SCREEN_DIM_SCRIM_INACTIVE = 'rgba(10, 10, 14, 0.76)';

export const STACK_SLOT_SCALE: Record<StackSlot, number> = {
  center: 1,
  left: 0.82,
  right: 0.82,
};

export function getSlot(idx: number, activeIdx: number, count: number): StackSlot {
  if (idx === activeIdx) return 'center';
  const diff = (idx - activeIdx + count) % count;
  return diff === 1 ? 'right' : 'left';
}

export function getCardTransform(slot: StackSlot, platform: DevicePlatform, centerPlatform: DevicePlatform): string {
  if (slot === 'center') {
    return 'translate3d(0,0,0) rotate(0deg)';
  }
  const rot = platform === 'mobile' ? 8 : 4;
  let tx = 28;
  if (centerPlatform === 'desktop') tx = 34;
  else if (centerPlatform === 'web' && platform === 'mobile') tx = 32;
  if (slot === 'left') {
    return `translate3d(-${tx}%, 5%, 0) rotate(-${rot}deg)`;
  }
  return `translate3d(${tx}%, 5%, 0) rotate(${rot}deg)`;
}
