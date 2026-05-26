/**
 * @file lang.ts
 * @description Leaf module for landing-side language constants.
 *
 * Why a separate file rather than living in `i18n.ts`:
 *
 *   `i18n.ts` imports `useThemeStore` (because the `useI18n` hook
 *   subscribes to it), and `theme-store.ts` needs `DEFAULT_LANG` /
 *   `isLang` / `Lang` at module-init time (Zustand's `create(...)`
 *   callback runs immediately to compute the initial state, which
 *   calls `resolveInitialLang()`, which references `DEFAULT_LANG`).
 *
 *   Putting these constants directly in `i18n.ts` creates a
 *   circular import — when the bundler picks an init order where
 *   `theme-store.ts` evaluates before `i18n.ts` finishes its own
 *   top-level statements, `DEFAULT_LANG` is in the temporal dead
 *   zone and the page crashes with
 *   `ReferenceError: Cannot access 'X' before initialization`.
 *
 *   This module deliberately imports nothing — it is a pure data
 *   leaf — so any other module can pull from it during its own
 *   initialization without re-entering a partially-loaded i18n.
 *
 * `i18n.ts` re-exports the public surface (`Lang`, `SUPPORTED_LANGS`,
 * `LANG_LABELS`, `DEFAULT_LANG`, `isLang`) so existing consumers can
 * keep importing from `theme/i18n` unchanged.
 */

export const SUPPORTED_LANGS = ['zh', 'en'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(v);
}
