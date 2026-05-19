// @eikon:feature(query) begin
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// @eikon:feature(query) end
import { type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { Toaster } from '@/shared/ui/toaster';

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

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Strip any trailing slash so react-router accepts the value (it errors on
 * '/foo/'). When the app is served at the site root (the common case) Vite
 * sets BASE_URL to '/', so basename ends up as '' which BrowserRouter treats
 * as the root. When the app is served under a sub-path — e.g. the preview
 * playground mounts each variant at `/preview/<hash>/` — that prefix is
 * preserved so internal links resolve correctly.
 */
const ROUTER_BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '');

export function AppProviders({ children }: AppProvidersProps) {
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
