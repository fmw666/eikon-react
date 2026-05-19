/**
 * @file router.tsx
 * @description Top-level <Routes> tree.
 *
 * Wires every feature's `*Routes` element under the shared
 * `<RootLayout />`. Adding a new feature is two lines: import its
 * `*Routes` from the feature barrel, drop it inside the layout
 * route.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core-related Libraries ---
import { Route, Routes } from 'react-router-dom';

// --- Absolute Imports ---
import { RootLayout } from '@/app/layouts/RootLayout';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { counterRoutes } from '@/features/counter';
import { homeRoutes } from '@/features/home';
import { tasksRoutes } from '@/features/tasks';

// =================================================================================================
// Component
// =================================================================================================

function AppRouter() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        {homeRoutes}
        {counterRoutes}
        {tasksRoutes}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { AppRouter };
