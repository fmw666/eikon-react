/**
 * @file routes.tsx
 * @description Route declarations for the Home feature.
 *
 * Lazy-loaded so the home page lands in its own chunk; the router's
 * shared <Suspense> boundary (see RootLayout) provides the fallback.
 *
 * The page chunk and the `home` i18n namespace are fetched IN
 * PARALLEL inside `lazy()` — by the time the page mounts, both its
 * JS and its translations are resident, so the user never sees a
 * flash of fallback keys when navigating into the route.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { lazy } from 'react';

// --- Core-related Libraries ---
import { Route } from 'react-router-dom';

// --- Absolute Imports ---
// @eikon:feature(i18n) begin
import { loadNamespace } from '@/shared/i18n';
// @eikon:feature(i18n) end

// =================================================================================================
// Lazy pages
// =================================================================================================

const HomePage = lazy(async () => {
  const [mod] = await Promise.all([
    import('./pages/HomePage'),
    // @eikon:feature(i18n) begin
    loadNamespace('home'),
    // @eikon:feature(i18n) end
  ]);
  return { default: mod.HomePage };
});

// =================================================================================================
// Exports
// =================================================================================================

export const homeRoutes = <Route path="/" element={<HomePage />} />;
