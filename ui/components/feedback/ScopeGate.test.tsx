/**
 * DRK-1679 §5:
 *   Scenario: An action the operator may not take stays on screen
 *     Given the operator Mai holds the read permissions but not the reverse permission
 *     When the console draws the reverse action
 *     Then the operator sees the action on screen and disabled
 *     And the operator sees that it needs the reverse permission
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { ScopeGate } from './ScopeGate';

describe('An action the operator may not take stays on screen', () => {
  it('keeps the reverse action visible, disabled, with the missing scope named', () => {
    render(
      createElement(
        ScopeGate,
        { scope: 'postings.reverse', granted: false },
        createElement('button', { type: 'button' }, 'Reverse'),
      ),
    );
    const button = screen.getByRole('button', { name: 'Reverse' });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(screen.getByText(/postings\.reverse/)).toBeInTheDocument();
  });
});
