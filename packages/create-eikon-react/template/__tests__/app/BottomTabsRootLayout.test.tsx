// @eikon:variant(layout=bottom-tabs) file
/**
 * @file BottomTabsRootLayout.test.tsx
 * @description Smoke test for the mobile bottom-tabs layout — verifies
 * the topbar brand, the bottom tab bar's primary destinations, the
 * active-tab styling, and the outlet rendering the matched route.
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
import { BottomTabsRootLayout } from '@/app/layouts/BottomTabsRootLayout';

// =================================================================================================
// Helpers
// =================================================================================================

function renderShell(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<BottomTabsRootLayout />}>
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

describe('<BottomTabsRootLayout />', () => {
  it('renders the brand link and the three primary tabs', () => {
    renderShell();
    expect(screen.getByRole('link', { name: /eikon app/i })).toHaveAttribute(
      'href',
      '/'
    );
    // Tab bar links share role=link with the brand; they're inside a
    // <nav aria-label="Primary…"> so the role-by-name lookup discovers
    // them by their visible icon-paired label.
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /counter/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /tasks/i })).toBeInTheDocument();
  });

  it('renders the matched child via <Outlet />', () => {
    renderShell('/tasks');
    expect(screen.getByText('tasks page')).toBeInTheDocument();
  });

  it('marks the active tab with the primary-color class', () => {
    renderShell('/tasks');
    const tasksLink = screen.getByRole('link', { name: /tasks/i });
    expect(tasksLink.className).toMatch(/var\(--color-primary\)/);
  });
});
