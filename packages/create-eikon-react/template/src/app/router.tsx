import { Route, Routes } from 'react-router-dom';

import { RootLayout } from '@/app/layouts/RootLayout';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { counterRoutes } from '@/features/counter';
import { homeRoutes } from '@/features/home';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        {homeRoutes}
        {counterRoutes}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
