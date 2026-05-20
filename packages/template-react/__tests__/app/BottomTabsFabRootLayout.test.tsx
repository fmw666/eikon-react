// @eikon:variant(layout=bottom-tabs-fab) file
/**
 * @file BottomTabsFabRootLayout.test.tsx
 * @description Smoke test for the mobile bottom-tabs-with-FAB layout —
 * verifies the topbar brand, the four flanking tabs, and the central
 * FAB linking to the tasks "compose" entry. Active-tab styling and
 * outlet rendering use the same conventions as BottomTabsRootLayout.
 *
 * First-line variant marker — file is deleted whole when the user picks
 * any other layout.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

// --- Absolute Imports ---
import { BottomTabsFabRootLayout } from '@/app/layouts/BottomTabsFabRootLayout';

// =================================================================================================
// Helpers
// =================================================================================================

function renderShell(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<BottomTabsFabRootLayout />}>
          <Route path="/" element={<p>home page</p>} />
          <Route path="/counter" element={<p>counter page</p>} />
          <Route path="/tasks" element={<p>tasks page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

// =================================================================================================
// Tests
// =================================================================================================

describe('<BottomTabsFabRootLayout />', () => {
  it('renders the brand and the flanking tabs', () => {
    renderShell();
    expect(screen.getByRole('link', { name: /eikon app/i })).toHaveAttribute(
      'href',
      '/'
    );
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /counter/i })).toBeInTheDocument();
  });

  it('renders the central FAB pointing at the tasks compose entry', () => {
    renderShell();
    const fab = screen.getByRole('link', { name: /new task|nav.compose/i });
    expect(fab).toHaveAttribute('href', '/tasks');
  });

  it('renders the matched child via <Outlet />', () => {
    renderShell('/counter');
    expect(screen.getByText('counter page')).toBeInTheDocument();
  });
});
