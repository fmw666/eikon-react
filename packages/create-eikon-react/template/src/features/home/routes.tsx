/**
 * @file routes.tsx
 * @description Route declarations for the Home feature.
 *
 * Lazy-loaded so the home page lands in its own chunk; the router's
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

const HomePage = lazy(() =>
  import('./pages/HomePage').then((m) => ({ default: m.HomePage }))
);

// =================================================================================================
// Exports
// =================================================================================================

export const homeRoutes = <Route path="/" element={<HomePage />} />;
