/**
 * @file theme-store.ts
 * @description Landing-page UI state: color theme + display language.
 *
 * Lives in its own Zustand store (separate from `shell/store.ts` which
 * holds playground-only UI state) because:
 *
 *   1. Theme + lang are persisted across sessions (`localStorage`);
 *      playground panel toggles are session-only.
 *   2. Subscribers are different sets — toggling Files in the playground
 *      shouldn't re-render the landing nav, and switching the landing
 *      theme shouldn't re-render the file tree.
 *
 * Per the planning decision A (no iframe coupling), changing theme or
 * lang here does NOT propagate into the previewed template iframe. The
 * iframe keeps its template-side defaults. We may revisit if/when we
 * decide to wire `?theme=` / `?lang=` query params into template-react.
 */

import { useEffect, useRef } from 'react';
import { create } from 'zustand';

import { DEFAULT_LANG, type Lang, isLang } from './i18n';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'eikon.theme';
const LANG_KEY = 'eikon.lang';

function readStoredLang(): Lang | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LANG_KEY);
    return isLang(raw) ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the initial theme on first paint.
 *
 * The theme-toggle control is currently hidden from the UI: until we
 * ship a polished light palette, we ALWAYS boot in dark, irrespective
 * of `prefers-color-scheme` or any stored value from an earlier
 * session. The `toggleTheme` action is kept on the store so future
 * iterations only need to flip the toggle visible — no migration of
 * persisted state required.
 *
 * Resolved synchronously so the very first render already has the
 * correct `dark` class on <html> — avoids the classic "white flash"
 * dark-mode bug.
 */
export function resolveInitialTheme(): Theme {
  return 'dark';
}

/**
 * Resolve the initial display language. Precedence:
 *
 *   1. Stored user choice (persisted by [[ThemeAndLangSync]] on every
 *      `setLang`, so a returning visitor sees their last picked language
 *      regardless of where their browser thinks they are).
 *   2. Default (`DEFAULT_LANG`).
 *
 * We deliberately do NOT consult `navigator.language` — the landing
 * targets an international audience and we want a stable English
 * default for every first-time visitor, including those on a
 * Chinese-locale browser. The dropdown is one click away if they
 * prefer Chinese, and that choice then sticks across sessions.
 */
export function resolveInitialLang(): Lang {
  const stored = readStoredLang();
  if (stored) return stored;
  return DEFAULT_LANG;
}

interface ThemeStore {
  theme: Theme;
  lang: Lang;
  setTheme: (next: Theme) => void;
  toggleTheme: () => void;
  setLang: (next: Lang) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: resolveInitialTheme(),
  lang: resolveInitialLang(),
  setTheme: (next) => set({ theme: next }),
  toggleTheme: () =>
    set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  setLang: (next) => set({ lang: next }),
}));

/**
 * Apply `theme` to <html> and persist both `theme` + `lang` to
 * localStorage on change. Mounted as a `null`-returning sibling at the
 * landing root so it can subscribe to the full store without forcing
 * the rest of the tree to re-render.
 */
export function ThemeAndLangSync(): null {
  const theme = useThemeStore((s) => s.theme);
  const lang = useThemeStore((s) => s.lang);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage may be unavailable in private mode — non-fatal.
    }
  }, [theme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem(LANG_KEY, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  // Trigger text-only fade-in animation on language switch.
  const isFirstLang = useRef(true);
  useEffect(() => {
    if (isFirstLang.current) {
      isFirstLang.current = false;
      return;
    }
    const root = document.documentElement;
    root.classList.add('eikon-lang-switching');
    const timer = setTimeout(() => root.classList.remove('eikon-lang-switching'), 400);
    return () => {
      clearTimeout(timer);
      root.classList.remove('eikon-lang-switching');
    };
  }, [lang]);

  return null;
}
