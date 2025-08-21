/**
 * @file ThemeProvider.tsx
 * @description ThemeProvider component, provides theme UI state using Zustand
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React, { useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

// --- Third-party Libraries ---
import { useStore } from 'zustand';

// --- Absolute Imports ---
import { useLocalStorage } from '@/shared/hooks/useLocalStorage';
import { updateThemeColor } from '@/shared/utils/themeColorManager';

// --- Relative Imports ---
import { themeStore } from './themeStore';

import type { Theme } from './themeStore';

// =================================================================================================
// Types
// =================================================================================================

interface ThemeProviderProps {
  children: ReactNode;
}

// =================================================================================================
// Component
// =================================================================================================

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'system');
  const setIsDarkMode = useStore(themeStore, state => state.setIsDarkMode);

  useEffect(() => {
    themeStore.setState({ theme });
  }, [theme]);

  useEffect(() => {
    const updateDarkMode = () => {
      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDarkMode(systemPrefersDark);
      } else {
        setIsDarkMode(theme === 'dark');
      }
    };

    updateDarkMode();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateDarkMode);

    return () => mediaQuery.removeEventListener('change', updateDarkMode);
  }, [theme, setIsDarkMode]);

  useEffect(() => {
    const { isDarkMode } = themeStore.getState();
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(isDarkMode ? 'dark' : 'light');
    
    // 初始化移动端主题色
    updateThemeColor(isDarkMode);
  }, []);

  useEffect(() => {
    const unsubscribe = themeStore.subscribe(
      (state) => state.isDarkMode,
      (isDarkMode) => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(isDarkMode ? 'dark' : 'light');
        
        // 更新移动端主题色
        updateThemeColor(isDarkMode);
      }
    );

    return unsubscribe;
  }, []);

  const handleSetTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
  }, [setTheme]);

  useEffect(() => {
    themeStore.setState({ setTheme: handleSetTheme });
  }, [handleSetTheme]);

  return <>{children}</>;
};

// =================================================================================================
// Exports
// =================================================================================================

export { ThemeProvider };
