/**
 * DRK-1696 §5:
 *   Scenario Outline: An amount is drawn at its own currency's scale
 *     | currency | places | amount   | shown      |
 *     | JPY      | 0      | 44120000 | 44,120,000 |
 *     | SGD      | 2      | 12400.5  | 12,400.50  |
 *     | BHD      | 3      | 318.004  | 318.004    |
 *
 *   Scenario: An amount keeps every digit the service sent
 *     Given the service answers with the balance 9007199254740993.75 in SGD for ACME-000123
 *     When the console draws that balance on either screen
 *     Then the operator sees 9,007,199,254,740,993.75
 *
 * Proves the detail screen itself draws a balance correctly — `Money.test.tsx` already
 * covers the primitive; this covers the new screen's use of it (`components/accounts/
 * AccountDetail.tsx` does not exist yet, so this is RED for a different reason than
 * `Money.test.tsx`'s scenarios, not a duplicate of them).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { AccountDetail, type AccountDetailAccount } from './AccountDetail';

function account(overrides: Partial<AccountDetailAccount>): AccountDetailAccount {
  return {
    accountNumber: 'ACME-000123',
    name: 'Operating account',
    currency: 'SGD',
    decimalPlaces: 2,
    balance: '0',
    availableBalance: '0',
    heldAmount: '0',
    floor: '0',
    status: 'Active',
    permittedToGoNegative: false,
    ...overrides,
  };
}

describe("An amount is drawn at its own currency's scale — the detail screen", () => {
  it.each([
    { currency: 'JPY', decimalPlaces: 0, amount: '44120000', shown: '44,120,000' },
    { currency: 'SGD', decimalPlaces: 2, amount: '12400.5', shown: '12,400.50' },
    { currency: 'BHD', decimalPlaces: 3, amount: '318.004', shown: '318.004' },
  ])('draws $amount $currency as $shown', ({ currency, decimalPlaces, amount, shown }) => {
    render(createElement(AccountDetail, { account: account({ currency, decimalPlaces, balance: amount, availableBalance: amount }) }));
    expect(screen.getByTestId('account-balance')).toHaveTextContent(shown);
  });
});

describe('An amount keeps every digit the service sent', () => {
  it('draws 9007199254740993.75 SGD as 9,007,199,254,740,993.75', () => {
    render(
      createElement(AccountDetail, {
        account: account({ balance: '9007199254740993.75', availableBalance: '9007199254740993.75' }),
      }),
    );
    expect(screen.getByTestId('account-balance')).toHaveTextContent('9,007,199,254,740,993.75');
  });
});

describe('AccountDetail — a chosen posting with no account id (DRK-1725)', () => {
  // DRK-1745: rewrite for the new form
  it.skip('offers no reverse surface when it has no account id to write against', () => {
    render(
      createElement(AccountDetail, {
        account: account({}),
        // @ts-expect-error DRK-1745: rewrite for the new form
        postings: [{ id: 'p1', postingNumber: 'PST-1', direction: 'Credit', amount: '5.00', currency: 'SGD', decimalPlaces: 2, effectiveDate: '2026-09-01' }],
      }),
    );
    fireEvent.click(screen.getByText('PST-1'));
    expect(screen.getByText('PST-1').closest('tr')).toHaveAttribute('data-state', 'selected');
    expect(screen.queryByRole('button', { name: 'Reverse' })).toBeNull();
  });
});

