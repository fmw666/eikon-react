// @eikon:variant(layout=mobile-drawer) file
/**
 * @file MobileDrawerRootLayout.test.tsx
 * @description Smoke test for the mobile drawer layout — verifies the
 * topbar branding, the hamburger button, the drawer's nav links, and
 * the outlet rendering the matched route. Loads the variant directly
 * (rather than via the dispatcher) so the test pins down the variant's
 * own behaviour regardless of which layout the unstripped template
 * happens to default to.
 *
 * The first-line marker means this file is deleted whole when the user
 * picks any other layout — same convention as the layout sibling files
 * themselves.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
import { MobileDrawerRootLayout } from '@/app/layouts/MobileDrawerRootLayout';

// =================================================================================================
// Helpers
// =================================================================================================

function renderShell(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<MobileDrawerRootLayout />}>
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

describe('<MobileDrawerRootLayout />', () => {
  it('renders the brand link and hamburger trigger; nav lives behind the drawer', () => {
    renderShell();
    expect(screen.getByRole('link', { name: /eikon app/i })).toHaveAttribute(
      'href',
      '/'
    );
    // The hamburger is the only menu trigger — ARIA label is i18n-keyed
    // with a literal English fallback, so the regex matches both states.
    expect(
      screen.getByRole('button', { name: /open navigation|nav.menu/i })
    ).toBeInTheDocument();
    // Drawer is closed at first render — nav links are NOT in the DOM.
    expect(screen.queryByRole('link', { name: /^counter$/i })).toBeNull();
  });

  it('opens the drawer and reveals nav links when the hamburger is clicked', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(
      screen.getByRole('button', { name: /open navigation|nav.menu/i })
    );
    expect(
      await screen.findByRole('link', { name: /home/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /counter/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /examples/i })).toHaveAttribute(
      'href',
      '/examples'
    );
    expect(screen.getByRole('link', { name: /tasks/i })).toBeInTheDocument();
  });

  it('renders the matched child via <Outlet />', () => {
    renderShell('/counter');
    expect(screen.getByText('counter page')).toBeInTheDocument();
  });
});
