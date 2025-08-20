/**
 * @file AppProvider.tsx
 * @description AppProvider component, provides all providers to the app
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React from 'react';
import type { ReactNode } from 'react';

// --- Relative Imports ---
import { AuthUIProvider } from './auth';
import { AuthInitializer, LanguageInitializer } from './initializers';
import { LanguageProvider } from './language';
import { ThemeProvider } from './theme';

// =================================================================================================
// Types
// =================================================================================================

interface AppProviderProps {
  children: ReactNode;
}

// =================================================================================================
// Components
// =================================================================================================

const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthUIProvider>
          {children}
        </AuthUIProvider>
        <AuthInitializer />
        <LanguageInitializer />
      </LanguageProvider>
    </ThemeProvider>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export { AppProvider };
