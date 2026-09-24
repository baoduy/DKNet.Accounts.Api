import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ListViewState } from '@/lib/url-state';
import { ACCOUNT_COLUMNS, toAccountsQuery } from './filters';

describe('toAccountsQuery', () => {
  it('produces no query for a search term under the minimum length', () => {
    expect(toAccountsQuery({ filters: { search: 'a' } })).toBeNull();
  });

  it('translates a currency filter to CurrencyCode, never Currency', () => {
    const params = toAccountsQuery({ filters: { currency: 'SGD' } })!;
    expect(params.get('filter')).toBe('CurrencyCode:Equal:SGD');
    expect(params.toString()).not.toContain('filter=Currency%3A');
  });

  it('carries search as a free-text term, not a filter triple', () => {
    const params = toAccountsQuery({ filters: { search: 'ACME-000123' } })!;
    expect(params.get('search')).toBe('ACME-000123');
  });

  it('serializes an ascending sort as the bare field name', () => {
    const state: ListViewState = { filters: {}, sort: { field: 'name', desc: false } };
    expect(toAccountsQuery(state)!.get('orderBy')).toBe('name');
    expect(toAccountsQuery(state)!.get('desc')).toBeNull();
  });

  it('serializes a descending sort with desc=true', () => {
    const state: ListViewState = { filters: {}, sort: { field: 'balance', desc: true } };
    expect(toAccountsQuery(state)!.get('desc')).toBe('true');
  });

  it('defaults pageNumber to 1 and carries the given page size', () => {
    const params = toAccountsQuery({ filters: {} }, 20)!;
    expect(params.get('pageNumber')).toBe('1');
    expect(params.get('pageSize')).toBe('20');
  });

  it('carries an explicit page number', () => {
    expect(toAccountsQuery({ filters: {}, page: 2 })!.get('pageNumber')).toBe('2');
  });

  it('omits pageSize when not passed (kills the undefined-check-removed mutant)', () => {
    expect(toAccountsQuery({ filters: {} })!.has('pageSize')).toBe(false);
  });

  it('skips an empty filter value instead of emitting an empty filter triple', () => {
    expect(toAccountsQuery({ filters: { currency: '' } })!.has('filter')).toBe(false);
  });
});

describe('ACCOUNT_COLUMNS', () => {
  const ROW = {
    accountNumber: 'ACME-000123',
    name: 'Operating account',
    currency: 'SGD',
    decimalPlaces: 2,
    balance: '12400.00',
    availableBalance: '12400.00',
    openedOn: '2026-01-01',
    status: 'Active',
  };

  it('availableBalance and openedOn are not sortable — no query counterpart', () => {
    const byKey = Object.fromEntries(ACCOUNT_COLUMNS.map((column) => [column.key, column]));
    expect(byKey.availableBalance.sortable).toBe(false);
    expect(byKey.openedOn.sortable).toBe(false);
    expect(byKey.name.sortable).toBe(true);
    expect(byKey.balance.sortable).toBe(true);
  });

  it('the currency column queries as CurrencyCode', () => {
    const currencyColumn = ACCOUNT_COLUMNS.find((column) => column.key === 'currency')!;
    expect(currencyColumn.queryAs).toBe('CurrencyCode');
  });

  it("the account number cell links to the account's own page", () => {
    const column = ACCOUNT_COLUMNS.find((c) => c.key === 'accountNumber')!;
    render(column.render!(ROW));
    const link = screen.getByRole('link', { name: 'ACME-000123' });
    expect(link).toHaveAttribute('href', '/accounts/ACME-000123');
  });

  it("the balance cell draws the amount at the account's own currency scale, with its currency", () => {
    const column = ACCOUNT_COLUMNS.find((c) => c.key === 'balance')!;
    render(column.render!(ROW));
    expect(screen.getByText('12,400.00 SGD', { exact: false })).toBeInTheDocument();
  });

  it('the status cell draws a status badge', () => {
    const column = ACCOUNT_COLUMNS.find((c) => c.key === 'status')!;
    render(column.render!(ROW));
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
