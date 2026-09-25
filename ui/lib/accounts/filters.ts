/**
 * DRK-1696 §3 rows 4-5 — the accounts screen's own filter/sort/search/page state, translated
 * to the service's generic list query surface (README.md "Listing groups and accounts").
 */
import { createElement } from 'react';
import type { LedgerColumn } from '@/components/ledger/LedgerTable';
import type { AccountsTableRow } from '@/components/accounts/AccountsTable';
import { AccountNumber } from '@/components/ledger/AccountNumber';
import { Money } from '@/components/ledger/Money';
import { Currency } from '@/components/ledger/Currency';
import { StatusBadge } from '@/components/ledger/StatusBadge';
import { formatDate } from '@/components/records/RecordsTable';
import { Chip } from '@/components/ui/chip';
import { Caption, Mono } from '@/components/ui/text';
import type { ListViewState } from '@/lib/url-state';

export const MIN_ACCOUNT_SEARCH_LENGTH = 2;

/** `null` when the term is acceptable (including empty — no narrowing). */
export function accountSearchError(term: string): string | null {
  if (term.length === 0) return null;
  if (term.length < MIN_ACCOUNT_SEARCH_LENGTH) return `A search needs at least ${MIN_ACCOUNT_SEARCH_LENGTH} characters.`;
  return null;
}

/**
 * `filters.currency` maps to the query surface's `CurrencyCode` (the mapped, queryable
 * column) — never `Currency` (the response-only re-declaration the service cannot query).
 * README.md: "On GET /v1/accounts, narrow by currency as CurrencyCode, not Currency."
 */
const FILTER_QUERY_FIELD: Record<string, string> = {
  currency: 'CurrencyCode',
  group: 'GroupId',
  status: 'Status',
};

/** Screen state → the service's query string. A too-short search term produces no query at all. */
export function toAccountsQuery(state: ListViewState, pageSize?: number): URLSearchParams | null {
  if (accountSearchError(state.filters.search ?? '') !== null) return null;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(state.filters)) {
    if (!value) continue;
    if (key === 'search') {
      params.append('search', value);
      continue;
    }
    const field = FILTER_QUERY_FIELD[key] ?? key;
    params.append('filter', `${field}:Equal:${value}`);
  }
  if (state.sort) {
    const field = FILTER_QUERY_FIELD[state.sort.field] ?? state.sort.field;
    params.set('orderBy', field);
    if (state.sort.desc) params.set('desc', 'true');
  }
  params.set('pageNumber', String(state.page ?? 1));
  if (pageSize !== undefined) params.set('pageSize', String(pageSize));
  return params;
}

/**
 * The kit's columns in the kit's order (Design/ui_kits/accounts-crud/Accounts.jsx).
 * `availableBalance` and `openedOn` have no query counterpart — never sortable. Group sorts
 * nowhere: `orderBy=GroupId` would order by the group's id, not the code the cell shows.
 */
export const ACCOUNT_COLUMNS: LedgerColumn<AccountsTableRow>[] = [
  {
    key: 'accountNumber',
    header: 'Account no.',
    sortable: true,
    render: (row) => createElement(AccountNumber, { value: row.accountNumber, href: `/accounts/${row.accountNumber}` }),
  },
  { key: 'name', header: 'Name', sortable: true },
  { key: 'groupId', header: 'Group', sortable: false, render: (row) => (row.groupCode ? createElement(Mono, null, row.groupCode) : null) },
  { key: 'classification', header: 'Classification', sortable: true, render: (row) => (row.classification ? createElement(Chip, null, row.classification) : null) },
  { key: 'status', header: 'Status', sortable: true, render: (row) => createElement(StatusBadge, { status: row.status }) },
  {
    key: 'balance',
    header: 'Balance',
    sortable: true,
    align: 'right',
    render: (row) => (row.decimalPlaces === undefined ? null : createElement(Money, { amount: row.balance, currency: row.currency, decimalPlaces: row.decimalPlaces })),
  },
  {
    key: 'availableBalance',
    header: 'Available',
    sortable: false,
    align: 'right',
    render: (row) =>
      row.decimalPlaces === undefined ? null : createElement(Money, { amount: row.availableBalance, currency: row.currency, decimalPlaces: row.decimalPlaces }),
  },
  { key: 'currency', header: 'Currency', sortable: true, queryAs: 'CurrencyCode', render: (row) => createElement(Currency, { code: row.currency }) },
  { key: 'openedOn', header: 'Opened', sortable: false, align: 'right', render: (row) => createElement(Caption, null, formatDate(row.openedOn)) },
];
