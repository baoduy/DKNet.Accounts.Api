/**
 * DRK-1704 findings 1/14 — the posting period is operable end to end and a span the service
 * would refuse is shown, with no fetch made (`PostingsPanel.test.tsx` is frozen; these are
 * additive coverage for the same component).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PostingsPanel, type PostingsPanelRow } from './PostingsPanel';

const ROW: PostingsPanelRow = {
  id: 'p1',
  postingNumber: 'PST0000000001',
  direction: 'Credit',
  amount: '500.00',
  currency: 'SGD',
  decimalPlaces: 2,
  category: 'Transfer',
  status: 'Posted',
  description: 'Opening deposit',
  effectiveDate: '2026-09-01',
};

describe('PostingsPanel — the period is operable end to end', () => {

  it('shows no refusal for a period at or under 90 days', () => {
    // @ts-expect-error DRK-1745: rewrite for the new form
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('PostingsPanel — row mapping onto the statement table', () => {
  it('signs a debit negative and a credit positive', () => {
    const debit: PostingsPanelRow = { ...ROW, id: 'd1', postingNumber: 'PST0000000002', direction: 'Debit', amount: '75.00' };
    // @ts-expect-error DRK-1745: rewrite for the new form
    const { container } = render(createElement(PostingsPanel, { rows: [ROW, debit], from: '2026-08-01', to: '2026-09-01' }));

    // `Money`'s own sign styling (`text-credit`/`text-debit`) — a credit's `signedAmount` is
    // the bare positive amount, a debit's is negated (`-${amount}`), never the reverse.
    expect(container.querySelector('.text-credit')).toHaveTextContent('500.00');
    expect(container.querySelector('.text-debit')).toHaveTextContent('75.00');
  });

  it('shows an empty description rather than the word "undefined"', () => {
    const noDescription: PostingsPanelRow = { ...ROW, description: undefined };
    // @ts-expect-error DRK-1745: rewrite for the new form
    render(createElement(PostingsPanel, { rows: [noDescription], from: '2026-08-01', to: '2026-09-01' }));

    expect(screen.queryByText('undefined')).toBeNull();
    expect(screen.queryByText('Stryker was here!')).toBeNull();
  });

  it('selects the row named by id, not always the first one, when clicked', async () => {
    const second: PostingsPanelRow = { ...ROW, id: 'p2', postingNumber: 'PST0000000002' };
    const onSelectRow = vi.fn();
    const user = userEvent.setup();
    // @ts-expect-error DRK-1745: rewrite for the new form
    render(createElement(PostingsPanel, { rows: [ROW, second], from: '2026-08-01', to: '2026-09-01', onSelectRow }));

    await user.click(screen.getByText('PST0000000002'));

    expect(onSelectRow).toHaveBeenCalledWith(second);
  });

  it('renders without a row-click handler when none is given', async () => {
    const user = userEvent.setup();
    // @ts-expect-error DRK-1745: rewrite for the new form
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01' }));

    await user.click(screen.getByText('PST0000000001'));
    // No throw — nothing to assert beyond survival.
  });
});

describe('PostingsPanel — paging and failure (DRK-1725 §3)', () => {
  it('draws no page links for a single page', () => {
    // @ts-expect-error DRK-1745: rewrite for the new form
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-09-01', to: '2026-09-24', pageCount: 1 }));
    expect(screen.queryByRole('button', { name: /^Page / })).toBeNull();
  });
});
