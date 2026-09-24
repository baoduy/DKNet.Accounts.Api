import { render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LedgerTable } from './LedgerTable';
import type { LedgerColumn } from './LedgerTable';

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
];

const COLUMNS: LedgerColumn<Row>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'id', header: 'Id', align: 'right' },
];

const TypedLedgerTable = LedgerTable<Row>;

describe('LedgerTable', () => {
  it('shows the empty message when there are no rows', () => {
    render(createElement(TypedLedgerTable, { columns: COLUMNS, rows: [], emptyMessage: 'No rows.' }));
    expect(screen.getByText('No rows.')).toBeInTheDocument();
  });

  it('renders a plain header with no sort control when onSort is not wired, and the row cells at their resolved key/index', () => {
    render(createElement(TypedLedgerTable, { columns: COLUMNS, rows: ROWS, rowKey: 'id' }));
    const headers = screen.getAllByRole('columnheader');
    for (const header of headers) {
      expect(within(header).queryByRole('button')).toBeNull();
    }
    expect(headers[0]).not.toHaveAttribute('aria-sort');
    expect(headers[0].className).not.toContain('text-right');
    expect(headers[1].className).toContain('text-right');

    const cells = screen.getAllByRole('cell');
    expect(cells.map((cell) => cell.textContent)).toEqual(['Alpha', 'a', 'Beta', 'b']);
    expect(cells[0].className).not.toContain('text-right');
    expect(cells[1].className).toContain('text-right');
  });

  it('shows the field as unset text when a row is missing the column key', () => {
    const columns: LedgerColumn<Row>[] = [{ key: 'missing', header: 'Missing' }];
    render(createElement(TypedLedgerTable, { columns, rows: ROWS, rowKey: 'id' }));
    const cells = screen.getAllByRole('cell');
    expect(cells.map((cell) => cell.textContent)).toEqual(['', '']);
  });

  it('renders a sort button and calls onSort with the field name for a sortable column, ascending', () => {
    const onSort = vi.fn();
    render(createElement(TypedLedgerTable, { columns: COLUMNS, rows: ROWS, rowKey: 'id', onSort, orderBy: 'name', desc: false }));
    screen.getByRole('button', { name: 'Name' }).click();
    expect(onSort).toHaveBeenCalledWith('name');
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('columnheader', { name: 'Id' })).not.toHaveAttribute('aria-sort');
  });

  it('marks the sorted column descending when desc is set', () => {
    const onSort = vi.fn();
    render(createElement(TypedLedgerTable, { columns: COLUMNS, rows: ROWS, rowKey: 'id', onSort, orderBy: 'name', desc: true }));
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'descending');
  });

  it('honours queryAs over key when resolving the sorted field', () => {
    const onSort = vi.fn();
    const columns: LedgerColumn<Row>[] = [{ key: 'name', header: 'Name', sortable: true, queryAs: 'DisplayName' }];
    render(createElement(TypedLedgerTable, { columns, rows: ROWS, rowKey: 'id', onSort }));
    screen.getByRole('button', { name: 'Name' }).click();
    expect(onSort).toHaveBeenCalledWith('DisplayName');
  });

  it('selects a row by click and marks it selected via a function rowKey', () => {
    const onSelectRow = vi.fn();
    render(
      createElement(TypedLedgerTable, {
        columns: COLUMNS,
        rows: ROWS,
        rowKey: (row: Row) => row.id,
        selectedId: 'b',
        onSelectRow,
      }),
    );
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[1]).toHaveAttribute('data-state', 'selected');
    expect(rows[0].className).toContain('cursor-pointer');
    rows[0].click();
    expect(onSelectRow).toHaveBeenCalledWith(ROWS[0]);
  });

  it('falls back to the row index as a key when rowKey is not given', () => {
    render(createElement(TypedLedgerTable, { columns: COLUMNS, rows: ROWS, selectedId: '1' }));
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).not.toHaveAttribute('data-state', 'selected');
    expect(rows[1]).toHaveAttribute('data-state', 'selected');
  });

  it('resolves a string rowKey off the row field, not the row index', () => {
    render(createElement(TypedLedgerTable, { columns: COLUMNS, rows: ROWS, rowKey: 'id', selectedId: 'b' }));
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).not.toHaveAttribute('data-state', 'selected');
    expect(rows[1]).toHaveAttribute('data-state', 'selected');
  });

  it('renders no cursor-pointer class and no click handler when onSelectRow is not wired', () => {
    render(createElement(TypedLedgerTable, { columns: COLUMNS, rows: ROWS, rowKey: 'id' }));
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0].className).not.toContain('cursor-pointer');
  });

  it('is not ascending by default when desc is left unset', () => {
    const onSort = vi.fn();
    render(createElement(TypedLedgerTable, { columns: COLUMNS, rows: ROWS, rowKey: 'id', onSort, orderBy: 'name' }));
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'ascending');
  });

  it('falls back to the default empty message when none is given', () => {
    render(createElement(TypedLedgerTable, { columns: COLUMNS, rows: [] }));
    expect(screen.getByText('No rows.')).toBeInTheDocument();
  });

  it('never selects a row whose id happens to stringify like an unset selection', () => {
    const rows: Row[] = [{ id: 'undefined', name: 'Odd' }];
    render(createElement(TypedLedgerTable, { columns: COLUMNS, rows, rowKey: 'id' }));
    const row = screen.getAllByRole('row')[1];
    expect(row).not.toHaveAttribute('data-state', 'selected');
  });
});
