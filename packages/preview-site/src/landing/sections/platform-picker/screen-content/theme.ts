import type { CSSProperties } from 'react';

export const SCREEN_FONT: CSSProperties['fontFamily'] =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif';

// Brand palette baked into the device-screen mockups so the three
// platforms read as one coherent product (the orange ramp matches the
// landing page's `--accent`). Centralised here so any future palette
// rebrand only touches this file.
export const BRAND = '#f59e0b';
export const BRAND_GRAD = 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)';
export const BRAND_TINT_BG = '#fffbf5';
export const BRAND_TINT_BORDER = '#fde68a';
export const TEXT_PRIMARY = '#1d1d1f';
export const TEXT_SECONDARY = '#6e6e73';
export const TEXT_TERTIARY = '#86868b';
export const SURFACE_RAISED = '#fafbfc';
export const BORDER_HAIRLINE = '#f0f0f2';
