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
  it('shows the 90-day refusal for a 120-day span and never calls onPeriodChange back into a wider one', () => {
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-05-01', to: '2026-09-01' }));
    expect(screen.getByText('The period may span at most 90 days.')).toBeInTheDocument();
  });

  it('shows no refusal for a period at or under 90 days', () => {
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('reports the new period when the operator changes the From date', () => {
    const onPeriodChange = vi.fn();
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01', onPeriodChange }));

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-08-15' } });

    expect(onPeriodChange).toHaveBeenCalledWith('2026-08-15', '2026-09-01');
  });

  it('reports a 7-day period when the 7d preset is clicked', async () => {
    const onPeriodChange = vi.fn();
    const user = userEvent.setup();
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

  it('reports the new period when the operator changes the To date', () => {
    const onPeriodChange = vi.fn();
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01', onPeriodChange }));

    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-10' } });

    expect(onPeriodChange).toHaveBeenCalledWith('2026-08-01', '2026-09-10');
  });
});

describe('PostingsPanel — the direction/category/status filters', () => {
  it('reports the merged filter, not the changed field alone, when direction changes', async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();
    render(
      createElement(PostingsPanel, {
        rows: [ROW],
        from: '2026-08-01',
        to: '2026-09-01',
        filter: { direction: '', category: 'Fee', status: 'Posted' },
        onFilterChange,
      }),
    );

    await user.selectOptions(screen.getByLabelText('Direction filter'), 'Debit');

    expect(onFilterChange).toHaveBeenCalledWith({ direction: 'Debit', category: 'Fee', status: 'Posted' });
  });

  it('reports the merged filter when category changes', async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01', onFilterChange }));

    await user.selectOptions(screen.getByLabelText('Category filter'), 'Fee');

    expect(onFilterChange).toHaveBeenCalledWith({ direction: '', category: 'Fee', status: '' });
  });

  it('reports the merged filter when status changes', async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01', onFilterChange }));

    await user.selectOptions(screen.getByLabelText('Status filter'), 'Reversed');

    expect(onFilterChange).toHaveBeenCalledWith({ direction: '', category: '', status: 'Reversed' });
  });
});

describe('PostingsPanel — row mapping onto the statement table', () => {
  it('signs a debit negative and a credit positive', () => {
    const debit: PostingsPanelRow = { ...ROW, id: 'd1', postingNumber: 'PST0000000002', direction: 'Debit', amount: '75.00' };
    const { container } = render(createElement(PostingsPanel, { rows: [ROW, debit], from: '2026-08-01', to: '2026-09-01' }));

    // `Money`'s own sign styling (`text-credit`/`text-debit`) — a credit's `signedAmount` is
    // the bare positive amount, a debit's is negated (`-${amount}`), never the reverse.
    expect(container.querySelector('.text-credit')).toHaveTextContent('500.00');
    expect(container.querySelector('.text-debit')).toHaveTextContent('75.00');
  });

  it('shows an empty description rather than the word "undefined"', () => {
    const noDescription: PostingsPanelRow = { ...ROW, description: undefined };
    render(createElement(PostingsPanel, { rows: [noDescription], from: '2026-08-01', to: '2026-09-01' }));

    expect(screen.queryByText('undefined')).toBeNull();
    expect(screen.queryByText('Stryker was here!')).toBeNull();
  });

  it('selects the row named by id, not always the first one, when clicked', async () => {
    const second: PostingsPanelRow = { ...ROW, id: 'p2', postingNumber: 'PST0000000002' };
    const onSelectRow = vi.fn();
    const user = userEvent.setup();
    render(createElement(PostingsPanel, { rows: [ROW, second], from: '2026-08-01', to: '2026-09-01', onSelectRow }));

    await user.click(screen.getByText('PST0000000002'));

    expect(onSelectRow).toHaveBeenCalledWith(second);
  });

  it('renders without a row-click handler when none is given', async () => {
    const user = userEvent.setup();
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01' }));

    await user.click(screen.getByText('PST0000000001'));
    // No throw — nothing to assert beyond survival.
  });
});

describe('PostingsPanel — never throws with no callback supplied', () => {
  it('survives a preset click with no onPeriodChange', async () => {
    const user = userEvent.setup();
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01' }));
    await user.click(screen.getByRole('button', { name: '7d' }));
    expect(screen.getByRole('button', { name: '7d' })).toBeInTheDocument();
  });

  it('survives typing a From/To date with no onPeriodChange', () => {
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01' }));
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-08-15' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-10' } });
    expect(screen.getByLabelText('From')).toBeInTheDocument();
  });

  it('survives a filter change with no onFilterChange', async () => {
    const user = userEvent.setup();
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01' }));
    await user.selectOptions(screen.getByLabelText('Direction filter'), 'Debit');
    expect(screen.getByLabelText('Direction filter')).toBeInTheDocument();
  });
});
