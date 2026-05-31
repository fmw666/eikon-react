/**
 * @file ExamplesIndexPage.test.tsx
 * @description Tests for the examples shell: the overview landing page
 * (the index Outlet) and the persistent sidebar in ExamplesLayout.
 *
 * The examples feature moved from one long scroll-spied page to a
 * route-per-component shell, so these assert the overview surfaces the
 * dev hero + component links, and the layout sidebar links to both the
 * inline sub-pages and the standalone showcase routes.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

// --- Absolute Imports ---
import { renderWithRouter } from '@test/test-utils';

// --- Relative Imports ---
import { ExamplesIndexPage } from '../../pages/ExamplesIndexPage';
import { ExamplesLayout } from '../../pages/ExamplesLayout';

// =================================================================================================
// Tests
// =================================================================================================

describe('<ExamplesIndexPage /> (overview)', () => {
  it('renders the translated meta header and dev-only badge', () => {
    renderWithRouter(<ExamplesIndexPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: /component showcase/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/dev only/i)).toBeInTheDocument();
  });

  it('links each component card to its own sub-page', () => {
    renderWithRouter(<ExamplesIndexPage />);
    expect(screen.getByRole('link', { name: 'Button' })).toHaveAttribute(
      'href',
      '/examples/button'
    );
    expect(screen.getByRole('link', { name: 'Table' })).toHaveAttribute(
      'href',
      '/examples/table'
    );
  });
});

describe('<ExamplesLayout /> sidebar', () => {
  function renderLayout() {
    return renderWithRouter(
      <Routes>
        <Route path="/examples" element={<ExamplesLayout />}>
          <Route index element={<div>overview</div>} />
        </Route>
      </Routes>,
      { routerEntries: ['/examples'] }
    );
  }

  it('navigates inline components to their route', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: 'Button' })).toHaveAttribute(
      'href',
      '/examples/button'
    );
  });

  it('links the standalone showcases too', () => {
    renderLayout();
    expect(
      screen.getAllByRole('link', { name: /toast/i }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('link', { name: /performance/i }).length
    ).toBeGreaterThan(0);
  });
});
