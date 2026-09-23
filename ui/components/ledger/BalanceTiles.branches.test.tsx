import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { BalanceTiles } from './BalanceTiles';

const ACCOUNT = {
  balance: '100.00',
  availableBalance: '100.00',
  heldAmount: '0.00',
  currency: 'SGD',
  decimalPlaces: 2,
};

describe('BalanceTiles — layout', () => {
  it('wraps in a flex-wrap tile layout by default', () => {
    const { container } = render(createElement(BalanceTiles, { account: ACCOUNT }));
    expect(container.firstElementChild).toHaveClass('flex', 'gap-6', 'flex-wrap');
    expect(container.firstElementChild).not.toHaveClass('flex-row');
  });

  it('lays out inline, still showing all three values, pinned above a statement', () => {
    const { container } = render(createElement(BalanceTiles, { account: ACCOUNT, layout: 'inline' }));
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Held')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass('flex', 'gap-6', 'flex-row', 'items-baseline');
    expect(container.firstElementChild).not.toHaveClass('flex-wrap');
  });
});
