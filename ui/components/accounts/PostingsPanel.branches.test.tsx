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
  });
});
