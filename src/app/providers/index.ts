/**
 * @file index.ts
 * @description Provider exports and AppProvider component
 * @author fmw666@github
 */

// =================================================================================================
// Exports
// =================================================================================================

export { AppProvider } from './AppProvider';
export { AuthInitializer, TaskInitializer } from './initializers';

// Theme exports
export {
  useTheme,
  useIsDarkMode,
  useSetTheme,
  useThemeClass,
  useIsSystemTheme,
  useIsManualTheme,
  useMemoizedThemeConfig,
  useMemoizedThemeState,
} from './theme';
export type { Theme, ThemeState } from './theme';

// Auth UI exports
export {
  useShowSignInModal,
  useOpenSignInModal,
  useCloseSignInModal,
  useModalActions,
  useMemoizedModalState,
} from './auth';
export type { AuthUIState } from './auth';
