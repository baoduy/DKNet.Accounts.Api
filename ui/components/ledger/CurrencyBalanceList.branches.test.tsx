import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { CurrencyBalanceList } from './CurrencyBalanceList';

describe('CurrencyBalanceList — empty state', () => {
  it('shows the empty message when the group holds no accounts', () => {
    render(createElement(CurrencyBalanceList, { balances: [], emptyMessage: 'No accounts in this group.' }));
    expect(screen.getByText('No accounts in this group.')).toBeInTheDocument();
  });

  it('falls back to a default empty message when none is given', () => {
    render(createElement(CurrencyBalanceList, { balances: [] }));
    expect(screen.getByText('No balances.')).toBeInTheDocument();
  });
});
