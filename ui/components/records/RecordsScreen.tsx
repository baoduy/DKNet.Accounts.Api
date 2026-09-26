/**
 * DRK-1713 §3 row 6 — the Records screen: postings across every account, with period,
 * narrowing, search, sort, page and open posting round-tripped through the page address
 * (`lib/url-state.ts`) so a copied link reproduces the view, mirroring `AccountsScreen`. It
 * opens on the last 30 days, most recently recorded first.
 *
 * DRK-1745 §3 rows 1, 3, 5, 6, 9, 10 (Design/ui_kits/records-crud) — the kit's page header with
 * `Record posting`, the list in a table card (search, count, filter menu with the one period
 * choice, pager), and one side panel over the card's right edge that views a posting
 * (`?open=<id>`) or records one (`?open=new`). Dropping an unsent record asks first; a recorded
 * or reversed posting is acknowledged above the card.
 */
'use client';

import { useLayoutEffect, useState, type JSX } from 'react';
import { Plus } from 'lucide-react';
import { RecordPostingForm, recordedText } from '@/components/accounts/RecordPostingForm';
import { reversedText } from '@/components/accounts/ReversePostingForm';
import { emptyMessage, postingsEmpty } from '@/components/feedback/empty';
import { FailedRead } from '@/components/feedback/RefusalAlert';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { useFlash } from '@/components/feedback/use-flash';
import { usePanelFocus } from '@/components/feedback/use-panel-focus';
import { DISCARD_RECORD, usePanelState } from '@/components/feedback/use-panel-state';
import { FilterField, FilterMenu } from '@/components/forms/FilterMenu';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { TableCard } from '@/components/ui/table-card';
import { Mono, Note } from '@/components/ui/text';
import { useAccountsById, usePosting, useRecords } from '@/lib/accounts/query';
import {
  DEFAULT_POSTING_PERIOD,
  MIN_POSTING_SEARCH_LENGTH,
  POSTING_CATEGORIES,
  POSTING_DIRECTIONS,
  POSTING_PERIOD_OPTIONS,
  POSTING_STATUSES,
  postingPeriod,
  postingPeriodRange,
  type PostingsFilterState,
} from '@/lib/accounts/postings-filter';
import { useCurrencies, useDecimalPlaces } from '@/lib/query/currencies';
import { pushRecent } from '@/lib/recent/store';
import { useListViewState, withFilter, type ListViewState } from '@/lib/url-state';
import { PostingDetails } from './PostingDetails';
import { RecordsTable, type RecordsTableRow } from './RecordsTable';

/** The console's list page size; the pager offers the kit's 5, 10, 25 and 50. */
const RECORDS_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
const DEFAULT_ORDER = { field: 'RecordedAt', desc: true };
const NEW_RECORD = 'new';

export interface RecordsScreenProps {
  grantedScopes: string[];
  /** Keys the operator's recently viewed list (DRK-1728 §3 row 8); unset, nothing is kept. */
  directoryObjectId?: string;
}

/** A narrowing left empty (or the default period) is dropped from the address. */
function setFilter(state: ListViewState, key: string, value: string): ListViewState {
  return withFilter(state, key, key === 'period' && value === DEFAULT_POSTING_PERIOD ? '' : value);
}

/** A select over the service's own values, `Any` first. */
function anyOf(values: readonly string[]): { value: string; label: string }[] {
  return [{ value: '', label: 'Any' }, ...values.map((value) => ({ value, label: value }))];
}

export function RecordsScreen({ grantedScopes, directoryObjectId }: RecordsScreenProps): JSX.Element {
  const [state, navigate] = useListViewState('/records');
  const [now] = useState(() => new Date());
  const flash = useFlash();

  const creating = state.openRecordId === NEW_RECORD;
  // An unsent record is never dropped without asking (DRK-1745 §3 row 9).
  const unsent = usePanelState({ copy: DISCARD_RECORD });

  const period = postingPeriod(state.filters.period);
  const sort = state.sort ?? DEFAULT_ORDER;
  const pageSize = state.pageSize ?? RECORDS_PAGE_SIZE;
  const filter: PostingsFilterState = {
    ...postingPeriodRange(period, now),
    direction: state.filters.direction ?? '',
    category: state.filters.category ?? '',
    status: state.filters.status ?? '',
    search: state.filters.search,
    orderBy: sort.field,
    desc: sort.desc,
    pageNumber: state.page ?? 1,
  };

  const recordsQuery = useRecords(filter, pageSize);
  const currenciesQuery = useCurrencies();
  const decimalPlacesOf = useDecimalPlaces();
  const viewedId = creating ? undefined : state.openRecordId;
  const openQuery = usePosting(viewedId);
  const items = recordsQuery.data?.items ?? [];
  const openPosting = viewedId ? (items.find((posting) => posting.id === viewedId) ?? openQuery.data) : undefined;
  const accountIds = [...new Set([...items.map((posting) => posting.accountId), ...(openPosting ? [openPosting.accountId] : [])])];
  const accountQueries = useAccountsById(accountIds);

  // Kept as the posting's details are drawn — before paint, so moving straight on still keeps it.
  const openedId = openPosting?.id ?? '';
  useLayoutEffect(() => {
    if (directoryObjectId && openedId) pushRecent(directoryObjectId, 'Posting', openedId);
  }, [directoryObjectId, openedId]);

  const accounts = new Map<string, { accountNumber: string; name: string }>();
  for (const query of accountQueries) {
    if (query.data?.account) accounts.set(query.data.account.id, query.data.account);
  }
  // Rows are drawn only once every account number and currency scale is known — never a guid in
  // the Account column or an amount at a guessed scale. A refused currency read is stated on its
  // own and the amounts are then drawn as the service sent them, never left loading.
  const ready = (currenciesQuery.data !== undefined || currenciesQuery.isError) && accountQueries.every((query) => !query.isPending);
  // A too-short search makes no read at all (`toPostingsQuery`).
  const queryable = !(filter.search && filter.search.length < MIN_POSTING_SEARCH_LENGTH);
  const loading = queryable && (recordsQuery.isPending || !ready);
  const narrowed = Boolean(filter.direction || filter.category || filter.status || filter.search);
  const panelOpen = creating || openPosting !== undefined;
  const panelRef = usePanelFocus<HTMLDivElement>(panelOpen);
  const rows: RecordsTableRow[] = items.map((posting) => ({
    id: posting.id,
    postingNumber: posting.postingNumber,
    accountNumber: accounts.get(posting.accountId)?.accountNumber ?? posting.accountId,
    direction: posting.direction,
    category: posting.category,
    amount: posting.amount,
    currency: posting.currency,
    decimalPlaces: decimalPlacesOf(posting.currency),
    effectiveDate: posting.effectiveDate,
    status: posting.status,
  }));

  const currentPage = state.page ?? 1;
  const writeGranted = grantedScopes.includes('postings.write');
  const activeFilters = [period !== DEFAULT_POSTING_PERIOD, filter.direction, filter.category, filter.status].filter(Boolean).length;
  const closePanel = (): void => navigate({ ...state, openRecordId: undefined });

  function filterSelect(key: string, value: string, options: { value: string; label: string }[]): JSX.Element {
    return <Select options={options} value={value} className="w-full" onChange={(event) => navigate(setFilter(state, key, event.target.value))} />;
  }

  let panel: JSX.Element | null = null;
  if (creating) {
    panel = (
      <RecordPostingForm
        granted={writeGranted}
        onClose={() => unsent.guard(closePanel)}
        onDirtyChange={unsent.onDirtyChange}
        onRecorded={(recorded) => {
          closePanel();
          flash.show({ title: 'Record posted', text: recordedText(recorded) });
        }}
      />
    );
  } else if (openPosting) {
    const account = accounts.get(openPosting.accountId);
    panel = (
      <PostingDetails
        posting={openPosting}
        accountNumber={account?.accountNumber ?? openPosting.accountId}
        accountName={account?.name}
        decimalPlaces={decimalPlacesOf(openPosting.currency)}
        reverseGranted={grantedScopes.includes('postings.reverse')}
        onClose={closePanel}
        onReversed={(reversed) => flash.show({ title: 'Record reversed', text: reversedText(reversed) })}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon="file-text"
        title="Records"
        description="Every movement recorded against an account. A record is immutable once posted; a correction is an opposing record."
        actions={
          <ScopeGate scope="postings.write" granted={writeGranted}>
            <Button type="button" variant="primary" onClick={() => navigate({ ...state, openRecordId: NEW_RECORD })}>
              <Plus size={14} aria-hidden="true" />
              Record posting
            </Button>
          </ScopeGate>
        }
      />

      {flash.card}

      {currenciesQuery.isError ? <FailedRead error={currenciesQuery.error} onRetry={() => void currenciesQuery.refetch()} /> : null}

      <TableCard
        searchPlaceholder="Search record, reference or description"
        searchValue={state.filters.search ?? ''}
        onSearchChange={(value) => navigate(setFilter(state, 'search', value))}
        rows={items.length}
        total={Number(recordsQuery.data?.totalItemCount ?? 0)}
        filter={
          <FilterMenu
            activeCount={activeFilters}
            onClear={() => navigate({ ...state, filters: state.filters.search ? { search: state.filters.search } : {}, page: undefined })}
          >
            <FilterField label="Period" hint="Effective date. 90 days is the widest window.">
              {filterSelect('period', period, POSTING_PERIOD_OPTIONS)}
            </FilterField>
            <FilterField label="Direction">{filterSelect('direction', filter.direction, anyOf(POSTING_DIRECTIONS))}</FilterField>
            <FilterField label="Category">{filterSelect('category', filter.category, anyOf(POSTING_CATEGORIES))}</FilterField>
            <FilterField label="Status">{filterSelect('status', filter.status, anyOf(POSTING_STATUSES))}</FilterField>
          </FilterMenu>
        }
        pagination={{
          page: currentPage,
          pageCount: Number(recordsQuery.data?.pageCount ?? 1),
          pageSize,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          onPageChange: (page) => navigate({ ...state, page }),
          onPageSizeChange: (size) => navigate({ ...state, pageSize: size, page: undefined }),
        }}
        panel={
          panel ? (
            // Holds the focus the panel takes; TableCard's panel slot sizes it and the panel full height.
            <div ref={panelRef} tabIndex={-1} data-testid="detail-panel" className="outline-none">
              {panel}
            </div>
          ) : null
        }
      >
        {recordsQuery.isError ? (
          <FailedRead error={recordsQuery.error} onRetry={() => void recordsQuery.refetch()} />
        ) : (
          <RecordsTable
            rows={rows}
            loading={loading}
            placeholderRows={pageSize}
            emptyMessage={emptyMessage(postingsEmpty(filter.from, filter.to), { total: Number(recordsQuery.data?.totalItemCount ?? 0), page: currentPage, filtered: narrowed })}
            orderBy={state.sort?.field}
            desc={state.sort?.desc}
            onSort={(field) => navigate({ ...state, sort: { field, desc: sort.field === field ? !sort.desc : false } })}
            selectedId={viewedId}
            onSelectRow={(row) => unsent.guard(() => navigate({ ...state, openRecordId: row.id === state.openRecordId ? undefined : row.id }))}
          />
        )}
      </TableCard>
      <Note>
        Amounts are shown at each currency&apos;s own precision and are never combined across currencies. <Mono>Balance after</Mono> is a property of one account&apos;s stream and
        belongs on that account&apos;s statement, not in this cross-account list.
      </Note>

      {unsent.dialog}
    </div>
  );
}
