import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CounterDisplay } from '../../components/CounterDisplay';

describe('<CounterDisplay />', () => {
  it('renders the current value', () => {
    render(<CounterDisplay value={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('updates when value changes', () => {
    const { rerender } = render(<CounterDisplay value={1} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    rerender(<CounterDisplay value={2} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
