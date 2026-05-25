// @eikon:variant(layout=stacked) file
/**
 * @file StackedRootLayout.test.tsx
 * @description Layout-specific test for the stacked nav variant — the
 * web / desktop default. Mirrors the per-layout tests we already ship
 * for the three mobile layouts (`MobileDrawerRootLayout.test.tsx`,
 * `BottomTabsRootLayout.test.tsx`, `BottomTabsFabRootLayout.test.tsx`).
 *
 * The first-line `@eikon:variant(layout=stacked) file` marker means
 * this file is deleted whole when the user picks any other layout —
 * same convention as the layout sibling component (`StackedRootLayout.tsx`)
 * and as the per-layout tests for the mobile variants.
 *
 * What's covered here that the dispatcher-level smoke
 * (`__tests__/app/RootLayout.test.tsx`) deliberately does not:
 *
 *   - Always-visible nav links in the header (stacked exposes Home,
 *     Counter, Tasks inline; mobile-drawer hides them behind a
 *     hamburger; bottom-tabs renders them in a footer dock).
 *   - Active-link styling — the `bg-[var(--color-primary)]` class is
 *     part of the stacked active treatment specifically.
 *   - Footer chrome ("Built with Eikon …") — only the four
 *     web/desktop layouts ship a footer; mobile layouts substitute
 *     a bottom-anchored dock.
 *
 * The per-layout split keeps each test honest about what it asserts
 * and lets a `--platform mobile` scaffold drop the layouts it doesn't
 * use without inheriting failing assertions.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// =================================================================================================
// Module mocks (must be hoisted ABOVE imports of code-under-test)
// =================================================================================================
//
// The layout renders <SignInButton /> from `@/features/auth`, which
// transitively imports `@/shared/supabase` via the auth service
// factory. The real supabase client constructs a Realtime client at
// module load that needs a `WebSocket` global — happy-dom doesn't
// provide one, so the import would crash before the layout renders.

vi.mock('@/shared/supabase', () => ({
  supabase: new Proxy(
    {},
    {
      get() {
        throw new Error(
          '@/shared/supabase was accessed in a layout test — mock it explicitly.'
        );
      },
    }
  ),
}));

// --- Absolute Imports ---
import { StackedRootLayout } from '@/app/layouts/StackedRootLayout';

// =================================================================================================
// Helpers
// =================================================================================================

function renderShell(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<StackedRootLayout />}>
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

describe('<StackedRootLayout />', () => {
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

  it('marks the active nav link with the primary background', () => {
    renderShell('/tasks');
    const tasksLink = screen.getByRole('link', { name: /tasks/i });
    expect(tasksLink.className).toMatch(/bg-\[var\(--color-primary\)\]/);
  });
});
