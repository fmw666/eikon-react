/**
 * @file ToasterShowcasePage.test.tsx
 * @description Smoke render test for the toaster showcase route.
 *
 * Verifies that all seven sibling preset triggers are present so a
 * later refactor that accidentally drops a preset (or its sibling
 * file) fails loudly here instead of in production.
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
import { ToasterShowcasePage } from '../../pages/ToasterShowcasePage';

// =================================================================================================
// Tests
// =================================================================================================

describe('<ToasterShowcasePage />', () => {
  it('renders the page heading and the fire buttons', () => {
    renderWithRouter(<ToasterShowcasePage />);
    expect(
      screen.getByRole('heading', { level: 2, name: /toaster/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fire success/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fire error/i })).toBeInTheDocument();
  });

  it('exposes all seven preset tabs', () => {
    renderWithRouter(<ToasterShowcasePage />);
    for (const id of [
      'default',
      'minimal',
      'apple',
      'glass',
      'terminal',
      'floating-bar',
      'stacked-cards',
    ]) {
      // Tab triggers are rendered as buttons with their text label.
      expect(
        screen.getByRole('tab', { name: id }),
        `missing preset tab '${id}'`
      ).toBeInTheDocument();
    }
  });
});
