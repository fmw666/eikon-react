/**
 * @file providers.tsx
 * @description App-level provider stack.
 *
 * Wraps the children with the router (BrowserRouter), the TanStack Query
 * provider, and the global toast renderer. Add new providers HERE rather
 * than in `main.tsx` so the provider order is a single review point.
 *
 * TanStack Query is treated as baseline infrastructure (alongside React
 * Router) — every scaffold ships with it, so the provider mounts
 * unconditionally. The cost when unused is negligible: one `QueryClient`
 * instance is allocated at module load, and the library itself sits in a
 * dedicated vendor chunk that the app never pulls into the main bundle
 * until something actually calls `useQuery` / `useMutation`.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { type ReactNode } from 'react';

// --- Core-related Libraries ---
import { BrowserRouter } from 'react-router-dom';

// --- Third-party Libraries ---
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- Absolute Imports ---
import { SignInModalMount } from '@/features/auth';
import { Toaster } from '@/shared/ui/toaster';

// =================================================================================================
// Constants
// =================================================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
        {/*
          Global sign-in / sign-up modal. Lives at provider scope (not
          inside a layout) so the modal is reachable from any route and
          survives layout-level remounts; opens via
          `useOpenSignInModal()()` from anywhere.
        */}
        <SignInModalMount />
      </QueryClientProvider>
    </BrowserRouter>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { AppProviders };
