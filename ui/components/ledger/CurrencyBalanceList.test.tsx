/**
 * DRK-1679 §5:
 *   Scenario: Balances in different currencies are never added
 *     Given the group Treasury holds 1,204,882.50 SGD and 44,120,000 JPY
 *     When the console draws that group's balances
 *     Then the operator sees one line for each currency
 *     And the operator sees a statement that these are not combined into a total
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { CurrencyBalanceList } from './CurrencyBalanceList';

describe('Balances in different currencies are never added', () => {
  it('shows one line per currency, with a not-summed statement built in', () => {
    render(
      createElement(CurrencyBalanceList, {
        balances: [
          { currency: 'SGD', amount: '1204882.50', decimalPlaces: 2 },
          { currency: 'JPY', amount: '44120000', decimalPlaces: 0 },
        ],
      }),
    );
    expect(screen.getByText('1,204,882.50')).toBeInTheDocument();
    expect(screen.getByText('44,120,000')).toBeInTheDocument();
    // The not-summed note ships built in — not removable by a prop, no "total" row exists.
    expect(screen.getByText(/not\b.*(combined|added|summed).*total|never added together/i)).toBeInTheDocument();
    expect(screen.queryByText(/^total$/i)).toBeNull();
  });
});
