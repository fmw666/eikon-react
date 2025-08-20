/**
 * @file AppRouter.tsx
 * @description Main App Router component
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React from 'react';

// --- Third-party Libraries ---
import { Routes, Route } from 'react-router-dom';

// --- Relative Imports ---
import { routes, wrapRoutesWithLayouts } from './routes';

// =================================================================================================
// Component
// =================================================================================================

const AppRouter: React.FC = () => {
  // Wrap routes with layouts
  const routesWithLayouts = wrapRoutesWithLayouts(routes);

  return (
    <Routes>
      {routesWithLayouts.map((route, index) => (
        <Route
          key={`${route.path}-${index}`}
          path={route.path}
          element={route.element}
          index={route.index}
          caseSensitive={route.caseSensitive}
        />
      ))}
    </Routes>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export { AppRouter };
