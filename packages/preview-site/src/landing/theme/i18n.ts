/**
 * @file i18n.ts
 * @description Minimal in-repo i18n for the landing page. Two locales,
 * one strongly-typed dictionary, one hook.
 *
 * We deliberately don't pull in i18next here — the landing only has ~30
 * strings, no plurals, no nested namespaces, and no need for lazy
 * loading. A typed dictionary + a memoised lookup hook beats a full
 * runtime for this surface.
 *
 * The previewed template (`template-react`) has its own i18next setup
 * which is unrelated to and unaffected by this module (decision A in
 * the design plan: no iframe coupling).
 */

import { useCallback } from 'react';

import { DICT } from './i18n-dict';
import { DEFAULT_LANG, type Lang, SUPPORTED_LANGS, isLang } from './lang';
import { useThemeStore } from './theme-store';

// Re-exported for backward compatibility — most consumers import
// these directly from `theme/i18n`. The actual definitions live in
// `./lang` (a leaf module with no React/zustand imports) so the
// `theme-store` ↔ `i18n` import cycle never sees them mid-init.
// See `theme/lang.ts` for the full rationale.
export { DEFAULT_LANG, SUPPORTED_LANGS, isLang };
export type { Lang };

/**
 * Native (self-)labels for the language dropdown. Each language is
 * displayed in its own script so users don't need to read the current
 * language to find their own — a "中文" / "English" pair is universally
 * recognisable.
 */
export const LANG_LABELS: Record<Lang, string> = {
  zh: '简体中文',
  en: 'English',
};


export type I18nKey = keyof (typeof DICT)['zh'];

/**
 * Compile-time guard: every key present in `zh` must also be present in
 * `en`. If you add a key to one and forget the other, TypeScript will
 * complain at this line. We assert via a phantom assignment so the
 * check has zero runtime cost.
 */
const _enParity: Record<I18nKey, string> = DICT.en;
void _enParity;

/**
 * Subscribe to `lang` once and return a stable `t()` function. The hook
 * is intentionally tiny: callers receive a memoised lookup so they don't
 * need to remember to memoise it themselves to avoid child re-renders.
 */
export function useI18n(): {
  lang: Lang;
  t: (key: I18nKey) => string;
} {
  const lang = useThemeStore((s) => s.lang);
  const t = useCallback(
    (key: I18nKey): string => {
      const table = DICT[lang];
      return table[key] ?? DICT[DEFAULT_LANG][key] ?? key;
    },
    [lang]
  );
  return { lang, t };
}
