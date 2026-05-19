import { lazy } from 'react';
import { Route } from 'react-router-dom';

// Lazy-loaded so the counter page lands in its own chunk; the router's
// shared <Suspense> boundary (see RootLayout) provides the fallback.
const CounterPage = lazy(() =>
  import('./pages/CounterPage').then((m) => ({ default: m.CounterPage }))
);

export const counterRoutes = <Route path="/counter" element={<CounterPage />} />;
