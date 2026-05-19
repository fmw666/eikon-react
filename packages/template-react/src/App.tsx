/**
 * @file App.tsx
 * @description Application root.
 *
 * Composes the provider stack (`AppProviders`) around the router
 * tree (`AppRouter`). Everything else lives behind one of these two.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Absolute Imports ---
import { AppProviders } from '@/app/providers';
import { AppRouter } from '@/app/router';

// =================================================================================================
// Component
// =================================================================================================

export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
