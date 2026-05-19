/**
 * @file routes.tsx
 * @description Route declarations for the Counter feature.
 *
 * Lazy-loaded so the counter page lands in its own chunk; the router's
 * shared <Suspense> boundary (see RootLayout) provides the fallback.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { lazy } from 'react';

// --- Core-related Libraries ---
import { Route } from 'react-router-dom';

// =================================================================================================
// Lazy pages
// =================================================================================================

const CounterPage = lazy(() =>
  import('./pages/CounterPage').then((m) => ({ default: m.CounterPage }))
);

// =================================================================================================
// Exports
// =================================================================================================

export const counterRoutes = (
  <Route path="/counter" element={<CounterPage />} />
);
