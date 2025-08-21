/**
 * @file types.ts
 * @description LazyComponent types
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import type { ReactNode } from 'react';

// =================================================================================================
// Types
// =================================================================================================

interface LazyComponentConfig {
  component: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: ReactNode;
  preload?: boolean;
  errorBoundary?: boolean;
}

interface LazyComponentProps {
  [key: string]: any;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// =================================================================================================
// Exports
// =================================================================================================

export type { LazyComponentConfig, LazyComponentProps, ErrorBoundaryState };
