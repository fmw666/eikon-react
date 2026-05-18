// @evomap:feature(query) begin
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// @evomap:feature(query) end
import { type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { Toaster } from '@/shared/ui/toaster';

// @evomap:feature(query) begin
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
// @evomap:feature(query) end

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      {/* @evomap:feature(query) begin */}
      <QueryClientProvider client={queryClient}>
        {/* @evomap:feature(query) end */}
        {children}
        <Toaster />
        {/* @evomap:feature(query) begin */}
      </QueryClientProvider>
      {/* @evomap:feature(query) end */}
    </BrowserRouter>
  );
}
