/**
 * @file App.tsx
 * @description Main App component
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React from 'react';

// --- Absolute Imports ---
import ErrorPage from '@/app/pages/ErrorPage';
import { AppProvider } from '@/app/providers';
import { AppRouter } from '@/app/router';
import { AppToaster } from '@/shared/components/Toast';
import { Sentry } from '@/shared/services/sentry';

// =================================================================================================
// Component
// =================================================================================================

const App: React.FC = () => {
  return (
    <>
      <Sentry.ErrorBoundary fallback={<ErrorPage />}>
        <AppToaster />
        <AppProvider>
          <AppRouter />
        </AppProvider>
      </Sentry.ErrorBoundary>
    </>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export default App;
