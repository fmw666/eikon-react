/**
 * @file types.ts
 * @description Router type definitions
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import type { ComponentType, ReactNode } from 'react';

// =================================================================================================
// Types
// =================================================================================================

interface RouteConfig {
  path: string;
  element: ReactNode;
  layout?: ComponentType<{ children: ReactNode }>;
  children?: RouteConfig[];
  index?: boolean;
  caseSensitive?: boolean;
  end?: boolean;
}

interface PrivateRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

// =================================================================================================
// Exports
// =================================================================================================

export type { RouteConfig, PrivateRouteProps };
