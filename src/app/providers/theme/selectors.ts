/**
 * @file selectors.ts
 * @description Theme state selectors
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import { useStore } from 'zustand';

import { themeStore } from './themeStore';

// =================================================================================================
// Types
// =================================================================================================

type Theme = 'light' | 'dark' | 'system';

// =================================================================================================
// Selectors
// =================================================================================================

function useTheme() {
  return useStore(themeStore, state => state.theme);
}

function useIsDarkMode() {
  return useStore(themeStore, state => state.isDarkMode);
}

function useSetTheme() {
  return useStore(themeStore, state => state.setTheme);
}

function useThemeClass() {
  return useStore(themeStore, state => state.isDarkMode ? 'dark' : 'light');
}

function useIsSystemTheme() {
  return useStore(themeStore, state => state.theme === 'system');
}

function useIsManualTheme() {
  return useStore(themeStore, state => state.theme !== 'system');
}

// =================================================================================================
// Memoized Selectors
// =================================================================================================

function useMemoizedThemeConfig() {
  return useStore(
    themeStore,
    state => ({
      theme: state.theme,
      isDarkMode: state.isDarkMode,
      isSystem: state.theme === 'system',
    })
  );
}

function useMemoizedThemeState() {
  return useStore(
    themeStore,
    state => ({
      theme: state.theme,
      isDarkMode: state.isDarkMode,
      setTheme: state.setTheme,
    })
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export {
  useTheme,
  useIsDarkMode,
  useSetTheme,
  useThemeClass,
  useIsSystemTheme,
  useIsManualTheme,
  useMemoizedThemeConfig,
  useMemoizedThemeState,
};
export type { Theme };
