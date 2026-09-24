/**
 * DRK-1696 §5:
 *   Scenario Outline: A column the service cannot sort offers no sort control
 *     | column            | control          |
 *     | name              | a sort control   |
 *     | balance           | a sort control   |
 *     | available balance | no sort control  |
 *     | opened date       | no sort control  |
 *
 *   Scenario: No total is worked out over a list
 *   Scenario: The accounts screen offers no export
 *   Scenario Outline: An amount is drawn at its own currency's scale (list column)
 *
 * `availableBalance` and `openedOn` have no query counterpart (README.md's "generic list
 * endpoint" note) — the table must not offer to sort by either. RED today:
 * `components/accounts/AccountsTable.tsx` does not exist.
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { AccountsTable, type AccountsTableRow } from './AccountsTable';

const ROW: AccountsTableRow = {
  accountNumber: 'ACME-000123',
  name: 'Operating account',
  currency: 'SGD',
  decimalPlaces: 2,
  balance: '12400.00',
  availableBalance: '12400.00',
  openedOn: '2026-01-01',
  status: 'Active',
};

describe("A column the service cannot sort offers no sort control", () => {
  it.each([
    { column: 'Name', hasControl: true },
    { column: 'Balance', hasControl: true },
    { column: 'Available balance', hasControl: false },
    { column: 'Opened', hasControl: false },
  ])('$column offers a sort control: $hasControl', ({ column, hasControl }) => {
    render(createElement(AccountsTable, { rows: [ROW], onSort: () => {} }));
    const header = screen.getByRole('columnheader', { name: new RegExp(column) });
    const button = header.querySelector('button');
    if (hasControl) {
      expect(button).not.toBeNull();
    } else {
      expect(button).toBeNull();
    }
  });
});

describe('No total is worked out over a list', () => {
  it('shows no total over a page of 1000 accounts', () => {
    const rows = Array.from({ length: 1000 }, (_, index) => ({ ...ROW, accountNumber: `ACME-${String(index).padStart(6, '0')}` }));
    render(createElement(AccountsTable, { rows }));
    expect(screen.queryByTestId('accounts-total')).toBeNull();
    expect(screen.queryByText(/^total$/i)).toBeNull();
  });
});

describe('The accounts screen offers no export', () => {
  it('offers no export control', () => {
    render(createElement(AccountsTable, { rows: [ROW] }));
    expect(screen.queryByRole('button', { name: /export/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /export/i })).toBeNull();
  });
});

describe("An amount is drawn at its own currency's scale — the accounts list", () => {
  it.each([
    { currency: 'JPY', decimalPlaces: 0, amount: '44120000', shown: '44,120,000' },
    { currency: 'SGD', decimalPlaces: 2, amount: '12400.5', shown: '12,400.50' },
    { currency: 'BHD', decimalPlaces: 3, amount: '318.004', shown: '318.004' },
  ])('draws $amount $currency as $shown', ({ currency, decimalPlaces, amount, shown }) => {
    render(createElement(AccountsTable, { rows: [{ ...ROW, currency, decimalPlaces, balance: amount }] }));
    expect(screen.getByText(shown, { exact: false })).toBeInTheDocument();
  });
});
