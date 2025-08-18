/**
 * @file index.ts
 * @description Theme provider exports
 * @author fmw666@github
 */

// =================================================================================================
// Exports
// =================================================================================================

export { ThemeProvider } from './ThemeProvider';
export {
  useTheme,
  useIsDarkMode,
  useSetTheme,
  useThemeClass,
  useIsSystemTheme,
  useIsManualTheme,
  useMemoizedThemeConfig,
  useMemoizedThemeState,
} from './selectors';

export type { Theme, ThemeState } from './themeStore';
