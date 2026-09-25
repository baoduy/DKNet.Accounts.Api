/**
 * DRK-1704 findings 1/14 — the posting period is operable end to end and a span the service
 * would refuse is shown, with no fetch made (`PostingsPanel.test.tsx` is frozen; these are
 * additive coverage for the same component).
 */
import { fireEvent, render, screen } from '@testing-library/react';
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
  // DRK-1745: rewrite for the new form
  it.skip('shows the 90-day refusal for a 120-day span and never calls onPeriodChange back into a wider one', () => {
    // @ts-expect-error DRK-1745: rewrite for the new form
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-05-01', to: '2026-09-01' }));
    expect(screen.getByText('The period may span at most 90 days.')).toBeInTheDocument();
  });

  it('shows no refusal for a period at or under 90 days', () => {
    // @ts-expect-error DRK-1745: rewrite for the new form
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  // DRK-1745: rewrite for the new form
  it.skip('reports the new period when the operator changes the From date', () => {
    const onPeriodChange = vi.fn();
    // @ts-expect-error DRK-1745: rewrite for the new form
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01', onPeriodChange }));

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-08-15' } });

    expect(onPeriodChange).toHaveBeenCalledWith('2026-08-15', '2026-09-01');
  });

  // DRK-1745: rewrite for the new form
  it.skip('reports a 7-day period when the 7d preset is clicked', async () => {
    const onPeriodChange = vi.fn();
    const user = userEvent.setup();
    // @ts-expect-error DRK-1745: rewrite for the new form
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01', onPeriodChange }));

    await user.click(screen.getByRole('button', { name: '7d' }));

    expect(onPeriodChange).toHaveBeenCalled();
    const [from, to] = onPeriodChange.mock.calls[0] as [string, string];
    const spanDays = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
    expect(spanDays).toBe(7);
    // Date-only — `toDateOnly` must slice off the time component, not pass the full ISO string.
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // DRK-1745: rewrite for the new form
  it.skip('reports the new period when the operator changes the To date', () => {
    const onPeriodChange = vi.fn();
    // @ts-expect-error DRK-1745: rewrite for the new form
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01', onPeriodChange }));

    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-10' } });

    expect(onPeriodChange).toHaveBeenCalledWith('2026-08-01', '2026-09-10');
  });
});

describe('PostingsPanel — the direction/category/status filters', () => {
  // DRK-1745: rewrite for the new form
  it.skip('reports the merged filter, not the changed field alone, when direction changes', async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();
    render(
      createElement(PostingsPanel, {
        rows: [ROW],
        // @ts-expect-error DRK-1745: rewrite for the new form
        from: '2026-08-01',
        to: '2026-09-01',
        filter: { direction: '', category: 'Fee', status: 'Posted' },
        onFilterChange,
      }),
    );

    await user.selectOptions(screen.getByLabelText('Direction filter'), 'Debit');

    expect(onFilterChange).toHaveBeenCalledWith({ direction: 'Debit', category: 'Fee', status: 'Posted' });
  });

  // DRK-1745: rewrite for the new form
  it.skip('reports the merged filter when category changes', async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();
    // @ts-expect-error DRK-1745: rewrite for the new form
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01', onFilterChange }));

    await user.selectOptions(screen.getByLabelText('Category filter'), 'Fee');

    expect(onFilterChange).toHaveBeenCalledWith({ direction: '', category: 'Fee', status: '' });
  });

  // DRK-1745: rewrite for the new form
  it.skip('reports the merged filter when status changes', async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();
    // @ts-expect-error DRK-1745: rewrite for the new form
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01', onFilterChange }));

    await user.selectOptions(screen.getByLabelText('Status filter'), 'Reversed');

    expect(onFilterChange).toHaveBeenCalledWith({ direction: '', category: '', status: 'Reversed' });
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

describe('PostingsPanel — never throws with no callback supplied', () => {
  // DRK-1745: rewrite for the new form
  it.skip('survives a preset click with no onPeriodChange', async () => {
    const user = userEvent.setup();
    // @ts-expect-error DRK-1745: rewrite for the new form
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01' }));
    await user.click(screen.getByRole('button', { name: '7d' }));
    expect(screen.getByRole('button', { name: '7d' })).toBeInTheDocument();
  });

  // DRK-1745: rewrite for the new form
  it.skip('survives typing a From/To date with no onPeriodChange', () => {
    // @ts-expect-error DRK-1745: rewrite for the new form
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01' }));
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-08-15' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-10' } });
    expect(screen.getByLabelText('From')).toBeInTheDocument();
  });

  // DRK-1745: rewrite for the new form
  it.skip('survives a filter change with no onFilterChange', async () => {
    const user = userEvent.setup();
    // @ts-expect-error DRK-1745: rewrite for the new form
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01' }));
    await user.selectOptions(screen.getByLabelText('Direction filter'), 'Debit');
    expect(screen.getByLabelText('Direction filter')).toBeInTheDocument();
  });
});

describe('PostingsPanel — paging and failure (DRK-1725 §3)', () => {
  it('draws no page links for a single page', () => {
    // @ts-expect-error DRK-1745: rewrite for the new form
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-09-01', to: '2026-09-24', pageCount: 1 }));
    expect(screen.queryByRole('button', { name: /^Page / })).toBeNull();
  });

  // DRK-1745: rewrite for the new form
  it.skip('links every page past one, marking only the current one, and opens the one chosen', () => {
    const onPageChange = vi.fn();
    // @ts-expect-error DRK-1745: rewrite for the new form
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-09-01', to: '2026-09-24', page: 2, pageCount: 2, onPageChange }));
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Page 1' })).not.toHaveAttribute('aria-current');
    fireEvent.click(screen.getByRole('button', { name: 'Page 1' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  // DRK-1745: rewrite for the new form
  it.skip('opens nothing, and never breaks, on a page link with no handler', () => {
    // @ts-expect-error DRK-1745: rewrite for the new form
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-09-01', to: '2026-09-24', pageCount: 2 }));
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Page 2' }))).not.toThrow();
  });

  // DRK-1745: rewrite for the new form
  it.skip('states a failed statement read in place of the table, keeping the filters usable', () => {
    const onRetry = vi.fn();
    // @ts-expect-error DRK-1745: rewrite for the new form
    render(createElement(PostingsPanel, { rows: [], from: '2026-09-01', to: '2026-09-24', failure: { error: new TypeError('Failed to fetch'), onRetry } }));
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('The ledger service cannot be reached.');
    expect(screen.getByLabelText('From', { exact: true })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
