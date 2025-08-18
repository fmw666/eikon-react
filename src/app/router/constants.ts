/**
 * @file constants.ts
 * @description Router constants and path definitions
 * @author fmw666@github
 */

// =================================================================================================
// Route Paths
// =================================================================================================

const ROUTES = {
  HOME: '/',
  TASK: {
    ROOT: '/tasks',
    NEW: '/tasks/new',
    BY_ID: '/tasks/:id'
  },
  EXAMPLE: {
    ROOT: '/example',
  },
  NOT_FOUND: '*'
} as const;

// =================================================================================================
// Route Names
// =================================================================================================

const ROUTE_NAMES = {
  HOME: 'Home',
  TASK: {
    ROOT: 'Task',
    NEW: 'New Task',
    BY_ID: 'Task Details'
  },
  EXAMPLE: {
    ROOT: 'Example',
  },
  NOT_FOUND: 'Not Found'
} as const;

// =================================================================================================
// Route Metadata
// =================================================================================================

const ROUTE_METADATA = {
  [ROUTES.HOME]: {
    title: ROUTE_NAMES.HOME,
    requiresAuth: false
  },
  [ROUTES.TASK.ROOT]: {
    title: ROUTE_NAMES.TASK.ROOT,
    requiresAuth: false
  },
  [ROUTES.TASK.NEW]: {
    title: ROUTE_NAMES.TASK.NEW,
    requiresAuth: true
  },
  [ROUTES.TASK.BY_ID]: {
    title: ROUTE_NAMES.TASK.BY_ID,
    requiresAuth: true
  },
  [ROUTES.EXAMPLE.ROOT]: {
    title: ROUTE_NAMES.EXAMPLE.ROOT,
    requiresAuth: false
  },
  [ROUTES.NOT_FOUND]: {
    title: ROUTE_NAMES.NOT_FOUND,
    requiresAuth: false
  }
} as const;

// =================================================================================================
// Exports
// =================================================================================================

export { ROUTES, ROUTE_NAMES, ROUTE_METADATA };
