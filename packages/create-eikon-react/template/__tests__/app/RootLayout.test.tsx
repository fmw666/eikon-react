/**
 * @file RootLayout.test.tsx
 * @description Smoke test for the app shell — verifies nav links resolve
 * to the right paths, header branding renders, and the outlet shows the
 * matched child route.
 *
 * Lives at the top level because RootLayout is in `src/app/` (it's the
 * application shell, not a feature) and the test crosses the boundary
 * between routes and the layout.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

// --- Absolute Imports ---
import { RootLayout } from '@/app/layouts/RootLayout';

// =================================================================================================
// Helpers
// =================================================================================================

function renderShell(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<RootLayout />}>
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

describe('<RootLayout />', () => {
  it('renders the brand link, the three nav entries and the footer', () => {
    renderShell();
    expect(screen.getByRole('link', { name: /eikon app/i })).toHaveAttribute(
      'href',
      '/'
    );
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /counter/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /tasks/i })).toBeInTheDocument();
    expect(screen.getByText(/built with eikon/i)).toBeInTheDocument();
  });

  it('renders the matched child via <Outlet />', () => {
    renderShell('/counter');
    expect(screen.getByText('counter page')).toBeInTheDocument();
  });

  it('marks the active nav link with the active class', () => {
    renderShell('/tasks');
    const tasksLink = screen.getByRole('link', { name: /tasks/i });
    expect(tasksLink.className).toMatch(/bg-\[var\(--color-accent\)\]/);
  });
});
