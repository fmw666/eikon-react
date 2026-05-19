/**
 * @file providers.tsx
 * @description App-level provider stack.
 *
 * Wraps the children with the router (BrowserRouter), optional
 * TanStack Query provider, and the global toast renderer. Add new
 * providers HERE rather than in `main.tsx` so the provider order is
 * a single review point.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { type ReactNode } from 'react';

// --- Core-related Libraries ---
import { BrowserRouter } from 'react-router-dom';

// --- Third-party Libraries ---
// @eikon:feature(query) begin
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// @eikon:feature(query) end

// --- Absolute Imports ---
import { Toaster } from '@/shared/ui/toaster';

// =================================================================================================
// Constants
// =================================================================================================

// @eikon:feature(query) begin
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
// @eikon:feature(query) end

/**
 * Strip any trailing slash so react-router accepts the value (it errors on
 * '/foo/'). When the app is served at the site root (the common case) Vite
 * sets BASE_URL to '/', so basename ends up as '' which BrowserRouter treats
 * as the root. When the app is served under a sub-path — e.g. the preview
 * playground mounts each variant at `/preview/<hash>/` — that prefix is
 * preserved so internal links resolve correctly.
 */
const ROUTER_BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '');

// =================================================================================================
// Types
// =================================================================================================

interface AppProvidersProps {
  children: ReactNode;
}

// =================================================================================================
// Component
// =================================================================================================

function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      {/* @eikon:feature(query) begin */}
      <QueryClientProvider client={queryClient}>
        {/* @eikon:feature(query) end */}
        {children}
        <Toaster />
        {/* @eikon:feature(query) begin */}
      </QueryClientProvider>
      {/* @eikon:feature(query) end */}
    </BrowserRouter>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { AppProviders };
