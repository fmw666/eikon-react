import type { RefObject } from 'react';

/**
 * Shared option shape for the footer spotlight hooks. The footer lifts
 * the two activation booleans to React state so the JSX className stays
 * the single source of truth for the `eikon-footer-gyro` /
 * `eikon-footer-light-active` classes; the hooks only flip them.
 */
export interface FooterSpotlightOptions {
  containerRef: RefObject<HTMLElement | null>;
  spotlightRef: RefObject<HTMLDivElement | null>;
  meadowRef: RefObject<HTMLDivElement | null>;
  setMeadowActivated: (active: boolean) => void;
  setLightActive: (active: boolean) => void;
}
