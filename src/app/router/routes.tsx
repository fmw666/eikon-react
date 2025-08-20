/**
 * @file routes.tsx
 * @description Application routes configuration
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { lazy, Suspense } from 'react';

// --- Absolute Imports ---
import { MainLayout, SimpleLayout } from '@/shared/components/Layout';
import { PageLoading } from '@/shared/components/Loading';

// --- Relative Imports ---
import { ROUTES } from './constants';
import { LayoutWrapper } from './LayoutWrapper';
import { PrivateRoute } from './PrivateRoute';
import { RouteConfig } from './types';

// =================================================================================================
// Lazy-loaded Components
// =================================================================================================

const ExamplePage = lazy(() => import('@/features/example/pages/ExamplePage'));
const NotFoundPage = lazy(() => import('@/app/pages/NotFoundPage'));
const HomePage = lazy(() => import('@/features/home/pages/HomePage'));
const TaskIndexPage = lazy(() => import('@/features/task/pages/TaskIndexPage'));
const TaskNewPage = lazy(() => import('@/features/task/pages/TaskNewPage'));
const TaskDetailsPage = lazy(() => import('@/features/task/pages/TaskDetailsPage'));

// =================================================================================================
// Route Configuration
// =================================================================================================

const routes: RouteConfig[] = [
  {
    path: ROUTES.HOME,
    element: <HomePage />,
    layout: SimpleLayout,
  },
  {
    path: ROUTES.TASK.ROOT,
    element: <TaskIndexPage />,
    layout: MainLayout,
  },
  {
    path: ROUTES.TASK.NEW,
    element: (
      <PrivateRoute fallback={<PageLoading />} redirectTo={ROUTES.TASK.ROOT} >
        <TaskNewPage />
      </PrivateRoute>
    ),
    layout: MainLayout,
  },
  {
    path: ROUTES.TASK.BY_ID,
    element: (
      <PrivateRoute fallback={<PageLoading />} redirectTo={ROUTES.TASK.ROOT} >
        <TaskDetailsPage />
      </PrivateRoute>
    ),
    layout: MainLayout,
  },
  {
    path: ROUTES.EXAMPLE.ROOT,
    element: <ExamplePage />,
    layout: SimpleLayout,
  },
  {
    path: ROUTES.NOT_FOUND,
    element: <NotFoundPage />,
    layout: SimpleLayout,
  }
];

// =================================================================================================
// Helper function to wrap routes with layouts
// =================================================================================================

const wrapRoutesWithLayouts = (routes: RouteConfig[]): RouteConfig[] => {
  return routes.map(route => ({
    ...route,
    element: (
      <LayoutWrapper layout={route.layout}>
        <Suspense fallback={<PageLoading />}>
          {route.element}
        </Suspense>
      </LayoutWrapper>
    ),
    children: route.children ? wrapRoutesWithLayouts(route.children) : undefined
  }));
};

// =================================================================================================
// Exports
// =================================================================================================

export { routes, wrapRoutesWithLayouts };
