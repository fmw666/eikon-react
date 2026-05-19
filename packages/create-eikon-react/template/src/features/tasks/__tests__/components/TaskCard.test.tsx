/**
 * @file TaskCard.test.tsx
 * @description Component tests for <TaskCard />.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

// --- Relative Imports ---
import { TaskCard } from '../../components/TaskCard';

import type { Task } from '../../types';

// =================================================================================================
// Fixtures
// =================================================================================================

const TASK: Task = {
  id: 'demo',
  title: 'Sample task',
  description: 'Sample description',
  status: 'in_progress',
  createdAt: new Date().toISOString(),
};

// =================================================================================================
// Tests
// =================================================================================================

describe('<TaskCard />', () => {
  it('renders title, description and a translated status badge', () => {
    render(<TaskCard task={TASK} />);
    expect(screen.getByText('Sample task')).toBeInTheDocument();
    expect(screen.getByText('Sample description')).toBeInTheDocument();
    // The test setup eagerly initialises i18next with the shipped `en`
    // bundle, so the translated string is the actual assertion target.
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('invokes onClick when activated', async () => {
    const onClick = vi.fn();
    render(<TaskCard task={TASK} onClick={onClick} />);
    await userEvent.click(screen.getByText('Sample task'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
