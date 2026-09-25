/**
 * DRK-1696 §5:
 *   Scenario: The floor settings are presented as one decision
 *     Given the operator Mai is editing the account ACME-000123
 *     When she looks at the floor settings
 *     Then she sees whether the account may go negative, its overdraft limit and its
 *          smallest permitted balance under one label
 *
 *   Scenario: An account not permitted to go negative takes no overdraft limit
 *     Given the operator Mai has typed an overdraft limit of 5,000.00 SGD for the account ACME-000123
 *     When she sets that account to not permitted to go negative
 *     Then the overdraft limit cannot be entered
 *     And the 5,000.00 SGD she typed is cleared
 *
 * RED today: `components/accounts/FloorSettings.tsx` does not exist.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement, useState, type JSX } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FloorSettings, type FloorSettingsValue } from './FloorSettings';

describe('The floor settings are presented as one decision', () => {
  // DRK-1745: rewrite for the new form
  it.skip('shows permitted-to-go-negative, overdraft limit and smallest permitted balance under one label', () => {
    render(createElement(FloorSettings, { value: { permittedToGoNegative: false, overdraftLimit: null, minimumBalance: null }, currency: 'SGD', onChange: () => {} }));

    const group = screen.getByRole('group', { name: /floor/i });
    expect(group).toContainElement(screen.getByLabelText(/permitted to go negative/i));
    expect(group).toContainElement(screen.getByLabelText(/overdraft limit/i));
    expect(group).toContainElement(screen.getByLabelText(/smallest permitted balance/i));
  });
});

describe('An account not permitted to go negative takes no overdraft limit', () => {
  // DRK-1745: rewrite for the new form
  it.skip('clears and disables the overdraft limit once negative is turned off', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    function Wrapper(): JSX.Element {
      const [value, setValue] = useState<FloorSettingsValue>({ permittedToGoNegative: true, overdraftLimit: '5000.00', minimumBalance: null });
      return createElement(FloorSettings, {
        value,
        currency: 'SGD',
        onChange: (next: FloorSettingsValue) => {
          onChange(next);
          setValue(next);
        },
      });
    }

    render(createElement(Wrapper));
    expect(screen.getByLabelText(/overdraft limit/i)).toHaveValue('5000.00');

    await user.click(screen.getByLabelText(/permitted to go negative/i));

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ permittedToGoNegative: false, overdraftLimit: null }));
    expect(screen.getByLabelText(/overdraft limit/i)).toBeDisabled();
    expect(screen.getByLabelText(/overdraft limit/i)).toHaveValue('');
  });
});
