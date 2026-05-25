/**
 * @file ExamplesIndexPage.test.tsx
 * @description Smoke render test for the examples index page.
 *
 * Asserts that the page mounts, surfaces the i18n title + dev-only
 * badge, and renders the three UI-primitive sections inline.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

// --- Absolute Imports ---
import { renderWithRouter } from '@test/test-utils';

// --- Relative Imports ---
import { ExamplesIndexPage } from '../../pages/ExamplesIndexPage';

// =================================================================================================
// Tests
// =================================================================================================

describe('<ExamplesIndexPage />', () => {
  it('renders the translated meta header', () => {
    renderWithRouter(<ExamplesIndexPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: /component showcase/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/dev only/i)).toBeInTheDocument();
  });

  it('renders all six inline section headings as anchors', () => {
    renderWithRouter(<ExamplesIndexPage />);
    // ShowcaseSection emits headings with id="<anchor>-heading".
    for (const anchor of ['button', 'card', 'tabs', 'theme', 'i18n', 'animation']) {
      expect(document.getElementById(`${anchor}-heading`)).not.toBeNull();
    }
  });

  it('links the TOC to the standalone showcase routes', () => {
    renderWithRouter(<ExamplesIndexPage />);
    expect(screen.getAllByRole('link', { name: /toast/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /dialog/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /performance/i }).length).toBeGreaterThan(0);
  });
});
