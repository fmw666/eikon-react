/**
 * @file themeStore.ts
 * @description Theme state store using Zustand
 */

// =================================================================================================
// Imports
// =================================================================================================

import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';

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
