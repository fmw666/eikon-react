/**
 * @file useFooterSpotlight.ts
 * @description Cursor / touch / gyroscope spotlight wiring for {@link Footer}.
 *
 * The footer carries a mouse-follow accent-glow halo on the desktop
 * (pointer: fine) and a long-press + gyroscope driven variant on touch
 * devices. Both paths also drive the meadow easter-egg mask via CSS vars
 * on the meadow element. This hook owns all of that imperative DOM
 * plumbing so Footer.tsx stays a layout component.
 *
 * The two input modes are independent code paths (each self-gates on the
 * `(pointer: fine)` media query and shares no state), so they live in
 * sibling hooks and this composite just runs both:
 *
 *   - {@link ./useFooterSpotlightDesktop} — pointer: fine mouse-follow.
 *   - {@link ./useFooterSpotlightTouch}   — touch long-press + gyroscope.
 *
 * The hook is given the footer container ref, the spotlight ref and the
 * meadow ref, plus the two activation setters (lifted to React state in
 * Footer so the JSX className stays the single source of truth for the
 * `eikon-footer-gyro` / `eikon-footer-light-active` classes).
 *
 * INTERNAL: not re-exported from the footer index barrel.
 */

import { useFooterSpotlightDesktop } from './useFooterSpotlightDesktop';
import { useFooterSpotlightTouch } from './useFooterSpotlightTouch';

import type { FooterSpotlightOptions } from './useFooterSpotlight.shared';

export type { FooterSpotlightOptions } from './useFooterSpotlight.shared';

export function useFooterSpotlight(options: FooterSpotlightOptions) {
  useFooterSpotlightDesktop(options);
  useFooterSpotlightTouch(options);
}
