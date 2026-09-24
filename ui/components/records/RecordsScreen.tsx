/**
 * DRK-1713 §3 row 6 — the Records screen: postings across every account, with period,
 * narrowing, search, sort, page and open posting round-tripped through the page address
 * (`lib/url-state.ts`) so a copied link reproduces the view, mirroring `AccountsScreen`. It
 * opens on the last 30 days, most recently recorded first; the shared record form sits above
 * the list and the chosen posting's details beside it.
 */
'use client';

import { useSearchParams } from 'next/navigation';
import { useId, useLayoutEffect, useState, type JSX } from 'react';
import { RecordPostingForm } from '@/components/accounts/RecordPostingForm';
import { emptyMessage, postingsEmpty } from '@/components/feedback/empty';
import { FailedRead } from '@/components/feedback/RefusalAlert';
import { usePanelFocus } from '@/components/feedback/use-panel-focus';
import { Input } from '@/components/ui/input';
import { useAccountsById, useCurrencies, usePosting, useRecords } from '@/lib/accounts/query';
import {
  MIN_POSTING_SEARCH_LENGTH,
  POSTING_CATEGORIES,
  POSTING_DIRECTIONS,
  POSTING_STATUSES,
  defaultPostingsFilter,
  postingPeriodError,
  type PostingsFilterState,
} from '@/lib/accounts/postings-filter';
import { pushRecent } from '@/lib/recent/store';
import { parseListViewState, toListViewSearchParams, type ListViewState } from '@/lib/url-state';
import { PostingDetails } from './PostingDetails';
import { RecordsTable, type RecordsTableRow } from './RecordsTable';

/** The accounts screen's own page size. */
const RECORDS_PAGE_SIZE = 10;
const DEFAULT_ORDER = { field: 'RecordedAt', desc: true };

export interface RecordsScreenProps {
  grantedScopes: string[];
  /** Keys the operator's recently viewed list (DRK-1728 §3 row 8); unset, nothing is kept. */
  directoryObjectId?: string;
}

/** A narrowing left empty is dropped; a period bound is kept even when empty, so an unset
 * period is refused on screen rather than silently falling back to the default. */
function setFilter(state: ListViewState, key: string, value: string): ListViewState {
  const filters = { ...state.filters };
  if (value || key === 'from' || key === 'to') filters[key] = value;
  else delete filters[key];
  return { ...state, filters, page: undefined };
}

export function RecordsScreen({ grantedScopes, directoryObjectId }: RecordsScreenProps): JSX.Element {
  const searchParams = useSearchParams();
  const [state, setState] = useState<ListViewState>(() => parseListViewState(searchParams));
  const [defaults] = useState(() => defaultPostingsFilter());
  const searchHintId = useId();

  // Same reasoning as `AccountsScreen.navigate`: local state first, the address bar mirrored
  // through the History API, so rapid changes never race a router round trip.
  function navigate(next: ListViewState): void {
    setState(next);
    window.history.pushState(null, '', `/records?${toListViewSearchParams(next).toString()}`);
  }

  const sort = state.sort ?? DEFAULT_ORDER;
  const filter: PostingsFilterState = {
    from: state.filters.from ?? defaults.from,
    to: state.filters.to ?? defaults.to,
    direction: state.filters.direction ?? '',
    category: state.filters.category ?? '',
    status: state.filters.status ?? '',
    search: state.filters.search,
    orderBy: sort.field,
    desc: sort.desc,
    pageNumber: state.page ?? 1,
  };
  const periodError = postingPeriodError(filter.from, filter.to);

  const recordsQuery = useRecords(filter, RECORDS_PAGE_SIZE);
  const currenciesQuery = useCurrencies();
  const openQuery = usePosting(state.openRecordId);
  const items = recordsQuery.data?.items ?? [];
  const openPosting = items.find((posting) => posting.id === state.openRecordId) ?? openQuery.data;
  const accountIds = [...new Set([...items.map((posting) => posting.accountId), ...(openPosting ? [openPosting.accountId] : [])])];
  const accountQueries = useAccountsById(accountIds);

  // Kept as the posting's details are drawn — before paint, so moving straight on still keeps it.
  const openedId = openPosting?.id ?? '';
  useLayoutEffect(() => {
    if (directoryObjectId && openedId) pushRecent(directoryObjectId, 'Posting', openedId);
  }, [directoryObjectId, openedId]);

  const accountNumbers = new Map<string, string>();
  for (const query of accountQueries) {
    if (query.data?.account) accountNumbers.set(query.data.account.id, query.data.account.accountNumber);
  }
  const decimalPlacesByCurrency = new Map((currenciesQuery.data ?? []).map((currency) => [currency.code, currency.decimalPlaces]));
  // Rows are drawn only once every account number and currency scale is known — never a guid in
  // the Account column or an amount at a guessed scale. A refused currency read is stated on its
  // own and the amounts are then drawn as the service sent them, never left loading.
  const ready = (currenciesQuery.data !== undefined || currenciesQuery.isError) && accountQueries.every((query) => !query.isPending);
  // A refused period or a too-short search makes no read at all (`toPostingsQuery`).
  const queryable = periodError === null && !(filter.search && filter.search.length < MIN_POSTING_SEARCH_LENGTH);
  const loading = queryable && (recordsQuery.isPending || !ready);
  const narrowed = Boolean(filter.direction || filter.category || filter.status || filter.search);
  const panelRef = usePanelFocus<HTMLElement>(openPosting !== undefined);
  const rows: RecordsTableRow[] = items.map((posting) => ({
    id: posting.id,
    postingNumber: posting.postingNumber,
    accountNumber: accountNumbers.get(posting.accountId) ?? posting.accountId,
    direction: posting.direction,
    category: posting.category,
    amount: posting.amount,
    currency: posting.currency,
    decimalPlaces: decimalPlacesByCurrency.get(posting.currency),
    effectiveDate: posting.effectiveDate,
    status: posting.status,
  }));

  const pageCount = recordsQuery.data?.pageCount ?? 1;
  const currentPage = state.page ?? 1;

  function selectFilter(key: string, label: string, emptyLabel: string, values: readonly string[]): JSX.Element {
    return (
      <label className="flex flex-col gap-1">
        {label}
        <select aria-label={label} value={state.filters[key] ?? ''} onChange={(event) => navigate(setFilter(state, key, event.target.value))}>
          <option value="">{emptyLabel}</option>
          {values.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <RecordPostingForm granted={grantedScopes.includes('postings.write')} />

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          From
          <input type="date" aria-label="From" value={filter.from} onChange={(event) => navigate(setFilter(state, 'from', event.target.value))} />
        </label>
        <label className="flex flex-col gap-1">
          To
          <input type="date" aria-label="To" value={filter.to} onChange={(event) => navigate(setFilter(state, 'to', event.target.value))} />
        </label>
        {selectFilter('direction', 'Direction filter', 'All directions', POSTING_DIRECTIONS)}
        {selectFilter('category', 'Category filter', 'All categories', POSTING_CATEGORIES)}
        {selectFilter('status', 'Status filter', 'All statuses', POSTING_STATUSES)}
        <label className="flex flex-col gap-1">
          Search postings
          <Input
            aria-label="Search postings"
            aria-describedby={searchHintId}
            value={state.filters.search ?? ''}
            onChange={(event) => navigate(setFilter(state, 'search', event.target.value))}
          />
          <span id={searchHintId} className="text-[length:var(--text-caption-size)] text-muted-foreground">
            Searches posting number, counterparty reference and description
          </span>
        </label>
      </div>

      {periodError ? <p role="alert">{periodError}</p> : null}

      {currenciesQuery.isError ? <FailedRead error={currenciesQuery.error} onRetry={() => void currenciesQuery.refetch()} /> : null}

      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {recordsQuery.isError ? (
            <FailedRead error={recordsQuery.error} onRetry={() => void recordsQuery.refetch()} />
          ) : (
            <RecordsTable
              rows={rows}
              loading={loading}
              emptyMessage={
                periodError ??
                emptyMessage(postingsEmpty(filter.from, filter.to), { total: Number(recordsQuery.data?.totalItemCount ?? 0), page: currentPage, filtered: narrowed })
              }
              orderBy={state.sort?.field}
              desc={state.sort?.desc}
              onSort={(field) => navigate({ ...state, sort: { field, desc: sort.field === field ? !sort.desc : false } })}
              selectedId={state.openRecordId}
              onSelectRow={(row) => navigate({ ...state, openRecordId: row.id === state.openRecordId ? undefined : row.id })}
            />
          )}

          <div className="flex items-center gap-2">
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
              <button key={page} type="button" aria-current={page === currentPage ? 'page' : undefined} onClick={() => navigate({ ...state, page })}>
                Page {page}
              </button>
            ))}
          </div>
        </div>

        {openPosting ? (
          <aside ref={panelRef} tabIndex={-1} data-testid="detail-panel" className="w-96 flex-none rounded-md border border-border p-4">
            <PostingDetails
              posting={openPosting}
              accountNumber={accountNumbers.get(openPosting.accountId) ?? openPosting.accountId}
              decimalPlaces={decimalPlacesByCurrency.get(openPosting.currency)}
              reverseGranted={grantedScopes.includes('postings.reverse')}
            />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
