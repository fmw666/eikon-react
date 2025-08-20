/**
 * @file LanguageProvider.tsx
 * @description LanguageProvider component, provides language UI state using Zustand
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React, { useCallback, useEffect, type ReactNode } from 'react';

// --- Absolute Imports ---
import { useLocalStorage } from '@/shared/hooks/useLocalStorage';

// --- Relative Imports ---
import { languageStore } from './languageStore';

import type { Language } from './languageStore';

// =================================================================================================
// Types
// =================================================================================================

interface LanguageProviderProps {
  children: ReactNode;
}

// =================================================================================================
// Component
// =================================================================================================

const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useLocalStorage<Language>('language', 'zh');

  useEffect(() => {
    languageStore.setState({ language });
  }, [language]);

  const handleSetLanguage = useCallback((newLanguage: Language) => {
    setLanguage(newLanguage);
  }, [setLanguage]);

  useEffect(() => {
    languageStore.setState({ setLanguage: handleSetLanguage });
  }, [handleSetLanguage]);

  return <>{children}</>;
};

// =================================================================================================
// Export
// =================================================================================================

export { LanguageProvider };
