// @eikon:variant(layout=centered) file
/**
 * @file CenteredRootLayout.test.tsx
 * @description Layout-specific coverage for the centered shell.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// =================================================================================================
// Module mocks
// =================================================================================================

vi.mock('@/shared/supabase', () => ({
  supabase: new Proxy(
    {},
    {
      get() {
        throw new Error(
          '@/shared/supabase was accessed in a layout test - mock it explicitly.'
        );
      },
    }
  ),
}));

// --- Absolute Imports ---
import { CenteredRootLayout } from '@/app/layouts/CenteredRootLayout';

// =================================================================================================
// Helpers
// =================================================================================================

function renderShell(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<CenteredRootLayout />}>
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

describe('<CenteredRootLayout />', () => {
  it('renders brand, navigation, and the matched child route', () => {
    renderShell('/counter');
    expect(screen.getByRole('link', { name: /eikon app/i })).toHaveAttribute(
      'href',
      '/'
    );
    expect(
      screen.getAllByRole('link', { name: /examples/i }).length
    ).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /examples/i })[0]).toHaveAttribute(
      'href',
      '/examples'
    );
    expect(screen.getByText('counter page')).toBeInTheDocument();
  });

  it('uses a compact card frame for ordinary pages', () => {
    renderShell('/');
    const frame = screen.getByText('home page').parentElement;
    expect(frame?.className).toContain('max-w-lg');
    expect(frame?.className).toContain('bg-[var(--color-card)]');
  });

  it('keeps centered content in the compact card frame', () => {
    renderShell('/tasks');
    const frame = screen.getByText('tasks page').parentElement;
    expect(frame?.className).toContain('max-w-lg');
    expect(frame?.className).toContain('p-6');
  });
});
