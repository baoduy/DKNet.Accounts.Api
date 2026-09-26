/**
 * DRK-1679 §5:
 *   Scenario: An account shows three values and its floor
 *     Given the account ACME-000123 holds 12,400.00 SGD with 0.00 held
 *     And the account is permitted to go negative up to 5,000.00 SGD
 *     When the console draws that account's balances
 *     Then the operator sees balance, available and held as three separate values
 *     And the operator sees the floor stated as -5,000.00 SGD
 *
 * Balance and Available are equal today (`AvailableBalance => Balance`, held funds
 * deferred), still shown as two separate tiles (BalanceTiles.d.ts).
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { BalanceTiles } from './BalanceTiles';
import { FloorLine } from './FloorLine';

const ACCOUNT = {
  balance: '12400.00',
  availableBalance: '12400.00',
  heldAmount: '0.00',
  currency: 'SGD',
  decimalPlaces: 2,
};

const FLOOR_POLICY = {
  permittedToGoNegative: true,
  overdraftLimit: '5000.00',
  minimumBalance: null,
  currency: 'SGD',
  decimalPlaces: 2,
};

describe("An account shows three values and its floor", () => {
  it('shows balance, available and held as three separate, named tiles', () => {
    render(createElement(BalanceTiles, { account: ACCOUNT }));
    // Three labelled tiles, not just two numbers — Balance and Available are equal
    // today by design (BalanceTiles.prompt.md), so the value alone can't tell them apart.
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Held')).toBeInTheDocument();
    expect(screen.getAllByText('12,400.00')).toHaveLength(2);
    expect(screen.getByText('0.00')).toBeInTheDocument();
  });

  it('states the floor as -5,000.00 SGD', () => {
    // The floor is the service's own figure for this policy (DRK-1760 §3 row 11) — the rendered,
    // string-formatted assertion below is what actually proves it, per R1.
    render(createElement(FloorLine, { account: FLOOR_POLICY, floor: '-5000.00' }));
    expect(screen.getByText(/−5,000\.00\s*SGD/)).toBeInTheDocument();
  });
});
