import type { CSSProperties, ReactNode } from 'react';

import type { Platform } from '@/lib/params-schema';
import type { DevicePlatform } from '@/shell/device-shell';

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

export const SCREEN_DIM_SCRIM_INACTIVE = 'rgba(10, 10, 14, 0.76)';

// Side cards sit at 0.84 of the centre slot's natural size. Slightly
// smaller than the previous 0.88 so the centre card clearly reads as
// the focal device — the iMac side has a wider natural footprint
// than the laptop centre, and at 0.88 the right-hand iMac visually
// dwarfed the centred laptop. 0.84 keeps the side hardware legible
// without that imbalance.
//
// Larger sides means the rotation+scale rasterisation samples less
// aggressively, so the device frame's 1px bezels + screen-content
// hairlines + small SVG icons read crisper on the rotated layer. The
// `filter:blur(0)` AA hint on `.eikon-stack-card` and INNER_BASE_STYLE
// fixes the *raster path*, but the *geometry* (steep rotation × small
// scale) still produces visible aliasing on detailed content — 0.84
// stays inside the regime where the AA hint can fully smooth it.
export const STACK_SLOT_SCALE: Record<StackSlot, number> = {
  center: 1,
  left: 0.84,
  right: 0.84,
};

const MOBILE_SIDE_TRANSLATE = 42;

export const INNER_BASE_STYLE: CSSProperties = {
  transformOrigin: 'center center',
  transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
  willChange: 'transform',
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
  // DO NOT REMOVE — forces Chromium to use high-quality AA on this GPU layer;
  // without it, backface-visibility:hidden degrades border-radius rendering
  // on scaled/rotated side cards (visible as wavy/jagged device borders).
  filter: 'blur(0px)',
  pointerEvents: 'auto',
  cursor: 'pointer',
};

export function getSlot(idx: number, activeIdx: number, count: number): StackSlot {
  if (idx === activeIdx) return 'center';
  const diff = (idx - activeIdx + count) % count;
  return diff === 1 ? 'right' : 'left';
}

export function getCardTransform(slot: StackSlot, platform: DevicePlatform, centerPlatform: DevicePlatform): string {
  if (slot === 'center') {
    return 'translate3d(0,0,0) rotate3d(0,0,1,0deg)';
  }
  // The fanned-deck rotation needs to engage the GPU's *3D* rasterisation
  // path (`rotate3d` instead of 2D `rotate`). Why: 2D rotate on Chromium
  // and iOS Safari rasterises the layer once at its natural size and
  // samples it rotated — at small angles (3-5°) this produces a visible
  // stair-step on the device frame's 1px hairlines and the screen
  // content's borders, which `filter: blur(0)` softens but doesn't
  // remove. The 3D path (engaged because the parent stage carries
  // `perspective: 1400px` and `.eikon-stack-card` carries
  // `transform-style: preserve-3d`) uses bilinear sampling on a 3D
  // composited surface, which produces a smoother edge. Visually
  // identical to a 2D rotate at these angles, just without the
  // stair-step.
  const rot = platform === 'mobile' ? 4 : 3;
  let tx = 26;
  if (platform === 'mobile') tx = MOBILE_SIDE_TRANSLATE;
  else if (centerPlatform === 'desktop') tx = 30;
  if (slot === 'left') {
    return `translate3d(-${tx}%, 5%, 0) rotate3d(0,0,1,-${rot}deg)`;
  }
  return `translate3d(${tx}%, 5%, 0) rotate3d(0,0,1,${rot}deg)`;
}
