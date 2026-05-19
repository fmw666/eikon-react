/**
 * @file routes.tsx
 * @description Route declarations for the Tasks feature.
 *
 * Lazy-loaded so each page lands in its own chunk; the shared
 * <Suspense> boundary in RootLayout provides the fallback. Order
 * matters: keep `/tasks/new` ABOVE `/tasks/:id` so the literal path
 * wins the match (react-router v7 still walks definition order for
 * non-tied scores).
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

const TasksIndexPage = lazy(() =>
  import('./pages/TasksIndexPage').then((m) => ({ default: m.TasksIndexPage }))
);
const TaskNewPage = lazy(() =>
  import('./pages/TaskNewPage').then((m) => ({ default: m.TaskNewPage }))
);
const TaskDetailsPage = lazy(() =>
  import('./pages/TaskDetailsPage').then((m) => ({ default: m.TaskDetailsPage }))
);

// =================================================================================================
// Exports
// =================================================================================================

export const tasksRoutes = (
  <>
    <Route path="/tasks" element={<TasksIndexPage />} />
    <Route path="/tasks/new" element={<TaskNewPage />} />
    <Route path="/tasks/:id" element={<TaskDetailsPage />} />
  </>
);
