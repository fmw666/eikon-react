/**
 * @file main.tsx
 * @description Main entry point for the application
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React from 'react';

// --- Core-related Libraries ---
import { BrowserRouter as Router } from 'react-router-dom';

// --- Third-party Libraries ---
import ReactDOM from 'react-dom/client';

import '@/shared/i18n';
import '@/styles/index';
import '@/shared/services/sentry';

import App from './App';

// =================================================================================================
// Render
// =================================================================================================

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Router
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}
  >
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </Router>
);
