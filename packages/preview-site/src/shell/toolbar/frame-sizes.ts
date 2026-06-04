// Internal to the shell Toolbar — not part of the feature index barrel.
// Device-frame size segmented-control metadata, shared by the desktop
// strip and the compact overflow menu.

import type { FrameSize } from '../store';

export const FRAME_SIZE_LABELS: Record<
  FrameSize,
  { label: string; mobile: string; desktop: string }
> = {
  small: { label: 'S', mobile: 'iPhone SE — 375 × 667', desktop: 'Laptop — 1024 × 640' },
  standard: {
    label: 'M',
    mobile: 'iPhone 14 Pro — 390 × 844',
    desktop: 'Desktop — 1280 × 800',
  },
  large: {
    label: 'L',
    mobile: 'iPhone Pro Max — 430 × 932',
    desktop: 'Monitor — 1440 × 900',
  },
};

export const FRAME_SIZES: readonly FrameSize[] = ['small', 'standard', 'large'];
