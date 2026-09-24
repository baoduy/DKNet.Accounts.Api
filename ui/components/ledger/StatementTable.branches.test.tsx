import { fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { StatementTable } from './StatementTable';
import type { StatementRowShape } from './StatementTable';

const REVERSED_ROW: StatementRowShape = {
  id: 'p4',
  effectiveDate: '2026-09-04',
  recordedAt: '2026-09-04T10:00:00Z',
  postingNumber: 'PST-000004',
  description: 'Reversal',
  signedAmount: '-1000.00',
  balanceAfter: '12600.00',
  streamPosition: 4,
  status: 'Reversed',
};

const POSTED_ROW: StatementRowShape = {
  id: 'p1',
  effectiveDate: '2026-09-01',
  recordedAt: '2026-09-01T10:00:00Z',
  postingNumber: 'PST-000001',
  description: 'Original',
  signedAmount: '500.00',
  balanceAfter: '900.00',
  streamPosition: 1,
  status: 'Posted',
};

describe('StatementTable — the reversed row and empty/select states', () => {
  it('marks a reversed row with a Reversed badge, a struck amount and a muted balance', () => {
    render(createElement(StatementTable, { rows: [REVERSED_ROW] }));
    expect(screen.getByText('Reversed')).toBeInTheDocument();
    const amount = screen.getByText('−1,000.00');
    expect(amount).toHaveClass('line-through');
    const balanceCell = screen.getByText('12,600.00');
    expect(balanceCell).toHaveClass('text-right', 'tabular-nums', 'text-muted-foreground');
  });

  it('leaves a posted row unmarked — no Reversed badge, no strike, no muted balance', () => {
    render(createElement(StatementTable, { rows: [POSTED_ROW] }));
    expect(screen.queryByText('Reversed')).toBeNull();
    const amount = screen.getByText('+500.00');
    expect(amount).not.toHaveClass('line-through');
    const balanceCell = screen.getByText('900.00');
    expect(balanceCell).toHaveClass('text-right', 'tabular-nums');
    expect(balanceCell).not.toHaveClass('text-muted-foreground');
  });

  it('shows the empty message when there are no rows', () => {
    render(createElement(StatementTable, { rows: [], emptyMessage: 'No postings recorded on this account.' }));
    expect(screen.getByText('No postings recorded on this account.')).toBeInTheDocument();
  });

  it('falls back to the default empty message when none is given', () => {
    render(createElement(StatementTable, { rows: [] }));
    expect(screen.getByText('No postings recorded on this account.')).toBeInTheDocument();
  });

  it('selects only the clicked row among several, and calls onSelectRow with it', () => {
    const onSelectRow = vi.fn();
    render(createElement(StatementTable, { rows: [POSTED_ROW, REVERSED_ROW], onSelectRow, selectedId: 'p4' }));
    const rows = screen.getAllByRole('row').slice(1);
    within(rows[1]).getByText('PST-000004').click();
    expect(onSelectRow).toHaveBeenCalledWith(REVERSED_ROW);
    expect(rows[1]).toHaveAttribute('data-state', 'selected');
    expect(rows[0]).not.toHaveAttribute('data-state', 'selected');
    expect(rows[0].className).toContain('cursor-pointer');
  });

  it('never selects a row whose id happens to stringify like an unset selection', () => {
    const oddRow: StatementRowShape = { ...POSTED_ROW, id: 'undefined' };
    render(createElement(StatementTable, { rows: [oddRow] }));
    const row = screen.getAllByRole('row')[1];
    expect(row).not.toHaveAttribute('data-state', 'selected');
  });

  it('links a posting to its href when postingHref is given', () => {
    render(createElement(StatementTable, { rows: [REVERSED_ROW], postingHref: (row) => `/postings/${row.id}` }));
    expect(screen.getByRole('link', { name: /PST-000004/ })).toHaveAttribute('href', '/postings/p4');
  });

  it('keeps its 5 headings over placeholder rows while loading, drawing no row (DRK-1725 R1)', () => {
    const { container } = render(createElement(StatementTable, { rows: [POSTED_ROW], loading: true, placeholderRows: 2 }));
    expect(container.querySelector('table')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('thead th')).toHaveLength(5);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(container.querySelectorAll('tbody tr:first-child td [data-slot="skeleton"]')).toHaveLength(5);
    expect(screen.queryByText('PST-000001')).toBeNull();
    expect(screen.queryByText('No postings recorded on this account.')).toBeNull();
  });

  it('stands ten placeholder rows of 4 cells in by default when the running balance is off', () => {
    const { container } = render(createElement(StatementTable, { rows: [], loading: true, showBalanceAfter: false }));
    expect(container.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(container.querySelectorAll('tbody tr:first-child td')).toHaveLength(4);
    expect(container.querySelector('table')!.style.minWidth).toBe('calc(4 * var(--spacing) * 24)');
  });

  it('states an empty statement in one body row across every column, under its headings', () => {
    render(createElement(StatementTable, { rows: [], emptyMessage: 'No more postings.' }));
    expect(screen.getByRole('cell', { name: 'No more postings.' })).toHaveAttribute('colspan', '5');
    expect(screen.getAllByRole('columnheader')).toHaveLength(5);
    expect(screen.getByRole('table')).toHaveClass('table-fixed');
  });

  it('opens a row with Enter, as a click does', () => {
    const onSelectRow = vi.fn();
    render(createElement(StatementTable, { rows: [POSTED_ROW, REVERSED_ROW], onSelectRow }));
    const row = screen.getAllByRole('row')[2];
    expect(row).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(onSelectRow).toHaveBeenCalledWith(REVERSED_ROW);
  });
});
