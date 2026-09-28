/**
 * DRK-1704 rework — findings 3, 7, 12, 13 (`AccountForm.test.tsx` is frozen; these are additive).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AccountForm, type AccountFormAccount, type AccountFormValues } from './AccountForm';

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

const GROUPS = [
  { value: 'g1', label: 'ACME' },
  { value: 'g2', label: 'Partner' },
];
const CURRENCIES = [
  { value: 'SGD', label: 'SGD' },
  { value: 'JPY', label: 'JPY' },
];

describe('AccountForm — the accounts.write gate (finding 7)', () => {

  it('leaves Save enabled by default (writeGranted defaults to true)', () => {
    render(createElement(AccountForm, { mode: 'edit', account: ACCOUNT }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
});

describe('AccountForm — field refusals are marked on their field (finding 3)', () => {

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

  it('finds the OVERDRAFT_LIMIT_REQUIRED entry by code, not merely the first alert error', () => {
    render(
      createElement(AccountForm, {
        mode: 'edit',
        account: { ...ACCOUNT, permittedToGoNegative: true, overdraftLimit: '5000.00' },
        errors: [
          { message: 'A different refusal.', code: 'SOME_OTHER_CODE' },
          { message: 'The real overdraft wording.', code: 'OVERDRAFT_LIMIT_REQUIRED' },
        ],
      }),
    );

    expect(screen.getByText('The real overdraft wording.')).toBeInTheDocument();
    expect(screen.getByText('A different refusal.')).toBeInTheDocument();
    // The overdraft wording appears exactly once — beside the floor controls, never duplicated
    // into the general alert too.
    expect(screen.getAllByText('The real overdraft wording.')).toHaveLength(1);
    // Pinned to the right entry: the badge sits right beside the overdraft wording specifically,
    // never beside "A different refusal." (kills the always-first/always-false/wrong-code finds).
    expect(screen.getByText('OVERDRAFT_LIMIT_REQUIRED').closest('p')).toHaveTextContent('The real overdraft wording.');
  });
});

describe('AccountForm — defaults when groups, currencies and errors are all omitted', () => {

  it('submits a blank groupId and currency, never a placeholder string, when no lists were offered', async () => {
    const onSubmit = vi.fn<(values: AccountFormValues) => void>();
    const user = userEvent.setup();
    render(
      createElement(AccountForm, {
        mode: 'open',
        account: { ...ACCOUNT, name: '', groupName: '', currency: '', classification: '' },
        groups: [],
        currencies: [],
        onSubmit,
      }),
    );

    await user.type(screen.getByLabelText('Name', { exact: true }), 'New account');
    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ groupId: '', currency: '' }));
  });
});

describe('AccountForm — field-level invalid marking and a missing onSubmit', () => {
  it('marks the Name field aria-invalid exactly "true" on a field-named refusal', () => {
    render(createElement(AccountForm, { mode: 'edit', account: ACCOUNT, errors: [{ message: 'Required.', field: 'Name' }] }));
    expect(screen.getByLabelText('Name', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  });

  it('never throws when Save is clicked with no onSubmit supplied', async () => {
    const user = userEvent.setup();
    render(createElement(AccountForm, { mode: 'edit', account: ACCOUNT }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});

describe('AccountForm — open mode submits the fields edit mode locks', () => {

  it('has no Account number or Status field — those are edit-only', () => {
    render(createElement(AccountForm, { mode: 'open', account: ACCOUNT, groups: GROUPS, currencies: CURRENCIES }));

    expect(screen.queryByLabelText('Account number')).toBeNull();
    expect(screen.queryByLabelText('Status')).toBeNull();
  });
});

describe('AccountForm — edit mode never submits the locked fields', () => {
  it('submits groupId, currency and classification as undefined', async () => {
    const onSubmit = vi.fn<(values: AccountFormValues) => void>();
    const user = userEvent.setup();
    render(createElement(AccountForm, { mode: 'edit', account: ACCOUNT, onSubmit }));

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: undefined, currency: undefined, classification: undefined }),
    );
  });

  it('submits the status only once the operator has picked one', async () => {
    const onSubmit = vi.fn<(values: AccountFormValues) => void>();
    const user = userEvent.setup();
    render(createElement(AccountForm, { mode: 'edit', account: ACCOUNT, onSubmit }));

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ status: undefined }));

    await user.selectOptions(screen.getByLabelText('Status'), 'Frozen');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'Frozen' }));
  });
});

describe('AccountForm — open-mode field refusals on group and currency (review round 2 nit 5)', () => {

  it('marks neither select when no field-named refusal is present', () => {
    render(createElement(AccountForm, { mode: 'open', account: ACCOUNT, groups: GROUPS, currencies: CURRENCIES }));
    expect(screen.getByLabelText('Group')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText('Currency')).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
