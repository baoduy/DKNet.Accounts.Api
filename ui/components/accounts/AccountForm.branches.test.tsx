/**
 * DRK-1704 rework — findings 3, 7, 13 (`AccountForm.test.tsx` is frozen; these are additive).
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { AccountForm, type AccountFormAccount } from './AccountForm';

const ACCOUNT: AccountFormAccount = {
  accountNumber: 'ACME-000123',
  groupName: 'ACME',
  name: 'Operating account',
  currency: 'SGD',
  classification: 'Liability',
  externalReference: 'PO-4471',
  notes: '',
  overdraftLimit: null,
  minimumBalance: null,
  permittedToGoNegative: false,
  status: 'Active',
};

describe('AccountForm — the accounts.write gate (finding 7)', () => {
  it('disables Save, Status and the floor controls with the requires-scope caption when not granted', () => {
    render(createElement(AccountForm, { mode: 'edit', account: ACCOUNT, writeGranted: false }));

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByLabelText('Status')).toBeDisabled();
    expect(screen.getByLabelText('Permitted to go negative')).toBeDisabled();
    expect(screen.getByLabelText('Smallest permitted balance')).toBeDisabled();
    expect(screen.getByText('requires accounts.write')).toBeInTheDocument();
  });

  it('leaves Save enabled by default (writeGranted defaults to true)', () => {
    render(createElement(AccountForm, { mode: 'edit', account: ACCOUNT }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
});

describe('AccountForm — field refusals are marked on their field (finding 3)', () => {
  it('shows a field-named refusal on the smallest permitted balance field', () => {
    render(
      createElement(AccountForm, {
        mode: 'edit',
        account: ACCOUNT,
        errors: [{ message: 'Must not exceed the balance.', field: 'MinimumBalance' }],
      }),
    );

    const field = screen.getByLabelText('Smallest permitted balance');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Must not exceed the balance.')).toBeInTheDocument();
  });

  it('shows a field-named refusal on the status field', () => {
    render(createElement(AccountForm, { mode: 'edit', account: ACCOUNT, errors: [{ message: 'Unknown status.', field: 'Status' }] }));

    expect(screen.getByLabelText('Status')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Unknown status.')).toBeInTheDocument();
  });

  it('routes a field-less refusal other than OVERDRAFT_LIMIT_REQUIRED to a RefusalAlert', () => {
    render(createElement(AccountForm, { mode: 'edit', account: ACCOUNT, errors: [{ message: 'The account holds a balance.', code: 'ACCOUNT_HOLDS_BALANCE' }] }));
    expect(screen.getByText('The account holds a balance.')).toBeInTheDocument();
  });
});

describe('AccountForm — the dead fieldErrors.OVERDRAFT_LIMIT_REQUIRED branch is gone (finding 13)', () => {
  it("shows only the service's own wording beside the floor controls, never an invented fallback", () => {
    render(
      createElement(AccountForm, {
        mode: 'edit',
        account: { ...ACCOUNT, permittedToGoNegative: true, overdraftLimit: '5000.00' },
        errors: [{ message: 'A negative-permitted account needs an overdraft limit.', code: 'OVERDRAFT_LIMIT_REQUIRED' }],
      }),
    );

    expect(screen.getByText('A negative-permitted account needs an overdraft limit.')).toBeInTheDocument();
    expect(screen.queryByText('An overdraft limit is required.')).toBeNull();
  });
});
