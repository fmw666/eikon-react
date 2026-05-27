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
import { authRoutes } from '@/features/auth';
import { counterRoutes } from '@/features/counter';
import { examplesRoutes } from '@/features/examples';
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
        {authRoutes}
        {/*
          The examples feature is a DEV-ONLY component showcase. It
          ships unconditionally in the scaffold so users can browse it
          locally with `npm run dev`; production bundles stay clean
          via the `import.meta.env.DEV` gate below — `pnpm build`
          (`vite build`) inlines DEV as `false`, tree-shaking the
          routes out. The preview playground builds the template with
          `mode: 'development'` so the gate stays open inside its
          iframe and the showcase routes render for in-browser preview.
        */}
        {import.meta.env.DEV && examplesRoutes}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { AppRouter };
