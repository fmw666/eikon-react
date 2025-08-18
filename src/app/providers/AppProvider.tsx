/**
 * @file AppProvider.tsx
 * @description AppProvider component, provides all providers to the app
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import React, { type ReactNode } from 'react';

import { AuthUIProvider } from './auth';
import { AuthInitializer } from './initializers';
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
      <AuthUIProvider>
        {children}
      </AuthUIProvider>
      <AuthInitializer />
    </ThemeProvider>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export { AppProvider };
