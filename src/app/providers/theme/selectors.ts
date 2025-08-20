/**
 * @file selectors.ts
 * @description Theme state selectors
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { useStore } from 'zustand';
import { useStoreWithEqualityFn } from 'zustand/traditional';

// --- Relative Imports ---
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
  return useStoreWithEqualityFn(
    themeStore,
    state => ({
      theme: state.theme,
      isDarkMode: state.isDarkMode,
      isSystem: state.theme === 'system',
    }),
    (prev, next) => {
      return prev.theme === next.theme && prev.isDarkMode === next.isDarkMode && prev.isSystem === next.isSystem;
    }
  );
}

function useMemoizedThemeState() {
  return useStoreWithEqualityFn(
    themeStore,
    state => ({
      theme: state.theme,
      isDarkMode: state.isDarkMode,
      setTheme: state.setTheme,
    }),
    (prev, next) => {
      return prev.theme === next.theme && prev.isDarkMode === next.isDarkMode && prev.setTheme === next.setTheme;
    }
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
