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
// @eikon:feature(examples) begin
import { examplesRoutes } from '@/features/examples';
// @eikon:feature(examples) end
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
        {/* @eikon:feature(examples) begin */}
        {/*
          The examples feature is a DEV-ONLY component showcase. Two
          orthogonal gates protect end-user bundles:
            1. CLI strip: the `@eikon:feature(examples)` markers remove
               this block (and the whole `src/features/examples/`
               directory) from scaffolded projects.
            2. Runtime DEV gate: even inside template-react itself,
               `import.meta.env.DEV` evaluates to `false` for a
               production build (`pnpm build`), so the routes never
               register in a deployed app. The preview playground
               builds the template with `mode: 'development'` so this
               gate stays open inside its iframe.
        */}
        {import.meta.env.DEV && examplesRoutes}
        {/* @eikon:feature(examples) end */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { AppRouter };
