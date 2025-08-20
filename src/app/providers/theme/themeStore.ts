/**
 * @file themeStore.ts
 * @description Theme state store using Zustand
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { subscribeWithSelector } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

// =================================================================================================
// Types
// =================================================================================================

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  isDarkMode: boolean;
  setTheme: (theme: Theme) => void;
  setIsDarkMode: (isDarkMode: boolean) => void;
}

// =================================================================================================
// Store
// =================================================================================================

const themeStore = createStore(
  subscribeWithSelector<ThemeState>((set) => ({
    theme: 'system',
    isDarkMode: false,
    setTheme: (theme) => set({ theme }),
    setIsDarkMode: (isDarkMode) => set({ isDarkMode }),
  }))
);

// =================================================================================================
// Exports
// =================================================================================================

export { themeStore };
export type { Theme, ThemeState };
