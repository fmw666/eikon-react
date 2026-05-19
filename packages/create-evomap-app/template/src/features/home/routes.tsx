import { lazy } from 'react';
import { Route } from 'react-router-dom';

// Lazy-loaded so the home page lands in its own chunk; the router's
// shared <Suspense> boundary (see RootLayout) provides the fallback.
const HomePage = lazy(() =>
  import('./pages/HomePage').then((m) => ({ default: m.HomePage }))
);

export const homeRoutes = <Route path="/" element={<HomePage />} />;
