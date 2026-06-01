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
import { fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

// --- Absolute Imports ---
import {
  LayoutVariantContext,
  type LayoutVariant,
} from '@/app/LayoutVariantContext';

import { renderWithRouter } from '@test/test-utils';

// --- Relative Imports ---
import { ExamplesIndexPage } from '../../pages/ExamplesIndexPage';
import { ExamplesLayout } from '../../pages/ExamplesLayout';

// =================================================================================================
// Tests
// =================================================================================================

describe('<ExamplesIndexPage /> (overview)', () => {
  it('renders the translated meta header', () => {
    renderWithRouter(<ExamplesIndexPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: /component showcase/i })
    ).toBeInTheDocument();
  });

  it('links each component card to its own sub-page', () => {
    renderWithRouter(<ExamplesIndexPage />);
    // The card's accessible name is "<title> <description>", so anchor
    // the match at the title rather than requiring an exact string.
    expect(screen.getByRole('link', { name: /^Button\b/ })).toHaveAttribute(
      'href',
      '/examples/button'
    );
    expect(screen.getByRole('link', { name: /^Table\b/ })).toHaveAttribute(
      'href',
      '/examples/table'
    );
  });
});

describe('<ExamplesLayout /> sidebar', () => {
  function renderLayout(layout?: LayoutVariant) {
    const tree = (
      <Routes>
        <Route path="/examples" element={<ExamplesLayout />}>
          <Route index element={<div>overview</div>} />
          <Route path="button" element={<div>button page</div>} />
        </Route>
      </Routes>
    );
    return renderWithRouter(
      layout ? (
        <LayoutVariantContext.Provider
          value={{ variant: layout, setVariant: () => undefined }}
        >
          {tree}
        </LayoutVariantContext.Provider>
      ) : (
        tree
      ),
      { routerEntries: ['/examples'] }
    );
  }

  it('shows the dev-only notice once in the shell', () => {
    renderLayout();
    expect(screen.getByText(/dev only/i)).toBeInTheDocument();
  });

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

  it('lists the newly added primitives', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: 'Progress' })).toHaveAttribute(
      'href',
      '/examples/progress'
    );
    expect(screen.getByRole('link', { name: 'Breadcrumb' })).toHaveAttribute(
      'href',
      '/examples/breadcrumb'
    );
    expect(screen.getByRole('link', { name: 'Keyboard' })).toHaveAttribute(
      'href',
      '/examples/kbd'
    );
  });

  it('filters the nav list as you type', () => {
    renderLayout();
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'button' },
    });
    expect(screen.getByRole('link', { name: 'Button' })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Table' })
    ).not.toBeInTheDocument();
  });

  it('uses a compact top navigation inside global-sidebar layouts', () => {
    renderLayout('sidebar');

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /basics/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Button' })).toHaveAttribute(
      'href',
      '/examples/button'
    );
  });
});
