/**
 * DRK-2325 §3 row 6 — the Transfers screen, mirroring `RecordsScreen`: the operator chooses an
 * account, then lists its transfers with period, search, sort and page, opens one with its
 * postings (`?open=<id>`) or records one (`?open=new`) in the side panel. The account and every
 * list setting round-trip through the page address (`lib/url-state.ts`), so a copied link reopens
 * the same view. No transfer is read before an account is chosen (R1).
 */
'use client';

import { useState, type JSX } from 'react';
import { Plus } from 'lucide-react';
import { FailedRead } from '@/components/feedback/RefusalAlert';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { useFlash } from '@/components/feedback/use-flash';
import { usePanelFocus } from '@/components/feedback/use-panel-focus';
import { usePanelState, type DiscardCopy } from '@/components/feedback/use-panel-state';
import { FilterField, FilterMenu } from '@/components/forms/FilterMenu';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { TableCard } from '@/components/ui/table-card';
import { Caption, Note } from '@/components/ui/text';
import { useAccounts, useAccountsById, type AccountDto } from '@/lib/accounts/query';
import { useCurrencies, useDecimalPlaces } from '@/lib/query/currencies';
import { DEFAULT_TRANSFER_PERIOD, MIN_TRANSFER_SEARCH_LENGTH, TRANSFER_PERIOD_OPTIONS, transferPeriod, useAccountTransfers, useTransfer, type TransferDto } from '@/lib/transfers/query';
import { useListViewState, withFilter, type ListViewState } from '@/lib/url-state';
import { RecordTransferForm } from './RecordTransferForm';
import { TransferDetails } from './TransferDetails';
import { amountText, toTransferView, TransfersTable } from './TransfersTable';

// ponytail: the account select lists the service's first 1000 accounts (its page-size ceiling), as
// the Records record panel does; a searchable picker is the upgrade once a ledger holds more.
const ACCOUNT_OPTIONS_PAGE_SIZE = 1000;
const TRANSFERS_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
const DEFAULT_ORDER = { field: 'RecordedAt', desc: true };
const NEW_TRANSFER = 'new';
const NO_ACCOUNT = 'Choose an account to see its transfers.';

const DISCARD_TRANSFER: DiscardCopy = {
  title: 'Discard unsent transfer?',
  text: 'This transfer has not been sent. Closing the panel drops it, and the idempotency key is discarded with it.',
  discardLabel: 'Discard transfer',
  discardClassName: 'ml-auto',
};

export interface TransfersScreenProps {
  grantedScopes: string[];
}

/** A setting left empty (or the default period) is dropped from the address. */
function setFilter(state: ListViewState, key: string, value: string): ListViewState {
  return withFilter(state, key, key === 'period' && value === DEFAULT_TRANSFER_PERIOD ? '' : value);
}

/** The `Transfer recorded` note: the amount sent and the converted amount the service recorded. */
function recordedText(transfer: TransferDto, accountNumberOf: (id: string) => string, placesOf: (code: string) => number | undefined): string {
  const sent = amountText(transfer.amount, transfer.sourceCurrency, placesOf(transfer.sourceCurrency));
  const converted = amountText(transfer.convertedAmount, transfer.destinationCurrency, placesOf(transfer.destinationCurrency));
  return `${sent} sent from ${accountNumberOf(transfer.sourceAccountId)}; ${converted} recorded to ${accountNumberOf(transfer.destinationAccountId)}. A new idempotency key has been minted for the next transfer.`;
}

export function TransfersScreen({ grantedScopes }: TransfersScreenProps): JSX.Element {
  const [state, navigate] = useListViewState('/transfers');
  const [now] = useState(() => new Date());
  const flash = useFlash();
  const unsent = usePanelState({ copy: DISCARD_TRANSFER });

  const accountId = state.filters.account ?? '';
  const creating = state.openRecordId === NEW_TRANSFER;
  const period = transferPeriod(state.filters.period);
  const search = state.filters.search ?? '';
  const sort = state.sort ?? DEFAULT_ORDER;
  const pageSize = state.pageSize ?? TRANSFERS_PAGE_SIZE;
  const currentPage = state.page ?? 1;

  const accountsQuery = useAccounts({ filters: {} }, ACCOUNT_OPTIONS_PAGE_SIZE);
  const transfersQuery = useAccountTransfers(accountId, { period, search, orderBy: sort.field, desc: sort.desc, pageNumber: currentPage, pageSize }, now);
  const currenciesQuery = useCurrencies();
  const placesOf = useDecimalPlaces();
  const viewedId = creating ? undefined : state.openRecordId;
  const openQuery = useTransfer(viewedId);

  const accounts: AccountDto[] = accountsQuery.data?.items ?? [];
  const items = accountId ? (transfersQuery.data?.items ?? []) : [];
  const openTransfer = viewedId ? (openQuery.data ?? items.find((transfer) => transfer.id === viewedId)) : undefined;

  // An account the select does not hold (past its first 1000) is read on its own, so a row never
  // shows an id where its account number belongs.
  const known = new Map(accounts.map((account) => [account.id, account.accountNumber]));
  const named = [...items, ...(openTransfer ? [openTransfer] : [])].flatMap((transfer) => [transfer.sourceAccountId, transfer.destinationAccountId, transfer.feeAccountId ?? '']);
  const missing = accountsQuery.isPending ? [] : [...new Set(named)].filter((id) => id && !known.has(id));
  const lookups = useAccountsById(missing);
  for (const lookup of lookups) {
    if (lookup.data?.account) known.set(lookup.data.account.id, lookup.data.account.accountNumber);
  }
  const accountNumberOf = (id: string): string => known.get(id) ?? id;

  // Rows are drawn once every account number and currency scale is known; a refused currency read
  // is stated on its own and the amounts are then drawn as the service sent them.
  const ready = (currenciesQuery.data !== undefined || currenciesQuery.isError) && !accountsQuery.isPending && lookups.every((lookup) => !lookup.isPending);
  const queryable = search.length === 0 || search.length >= MIN_TRANSFER_SEARCH_LENGTH;
  const loading = accountId !== '' && queryable && (transfersQuery.isPending || !ready);
  const rows = items.map((transfer) => toTransferView(transfer, accountNumberOf, placesOf));

  const writeGranted = grantedScopes.includes('postings.write');
  const panelOpen = creating || openTransfer !== undefined;
  const panelRef = usePanelFocus<HTMLDivElement>(panelOpen);
  const closePanel = (): void => navigate({ ...state, openRecordId: undefined });

  let emptyMessage = NO_ACCOUNT;
  if (accountId) emptyMessage = search ? 'No transfers match this search.' : 'No transfers in this period.';
  if (accountId && currentPage > 1 && Number(transfersQuery.data?.totalItemCount ?? 0) > 0) emptyMessage = 'No more transfers.';

  let panel: JSX.Element | null = null;
  if (creating) {
    panel = (
      <RecordTransferForm
        accounts={accounts}
        sourceAccountId={accountId}
        granted={writeGranted}
        onClose={() => unsent.guard(closePanel)}
        onDirtyChange={unsent.onDirtyChange}
        onRecorded={(transfer) => {
          closePanel();
          flash.show({ title: 'Transfer recorded', text: recordedText(transfer, accountNumberOf, placesOf) });
        }}
      />
    );
  } else if (openTransfer) {
    panel = (
      <TransferDetails
        transfer={openTransfer}
        view={toTransferView(openTransfer, accountNumberOf, placesOf)}
        postings={openQuery.data?.postings}
        postingsError={openQuery.error}
        onRetry={() => void openQuery.refetch()}
        accountNumberOf={accountNumberOf}
        placesOf={placesOf}
        onClose={closePanel}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon="arrow-left-right"
        title="Transfers"
        description="Money moved between 2 accounts in 1 step, converted at the operator's rate when the currencies differ. A transfer is immutable once recorded."
        actions={
          <ScopeGate scope="postings.write" granted={writeGranted}>
            <Button type="button" variant="primary" onClick={() => unsent.guard(() => navigate({ ...state, openRecordId: NEW_TRANSFER }))}>
              <Plus size={14} aria-hidden="true" />
              Record transfer
            </Button>
          </ScopeGate>
        }
      />

      {flash.card}

      <div className="flex flex-wrap items-center gap-3">
        <Caption>Account</Caption>
        <Select
          aria-label="Account"
          options={[{ value: '', label: 'Select an account' }, ...accounts.map((account) => ({ value: account.id, label: `${account.accountNumber} — ${account.name}` }))]}
          value={accountId}
          className="w-96"
          onChange={(event) => navigate({ ...withFilter(state, 'account', event.target.value), openRecordId: creating ? state.openRecordId : undefined })}
        />
      </div>
      {accountsQuery.isError ? <FailedRead error={accountsQuery.error} onRetry={() => void accountsQuery.refetch()} /> : null}
      {currenciesQuery.isError ? <FailedRead error={currenciesQuery.error} onRetry={() => void currenciesQuery.refetch()} /> : null}

      <TableCard
        searchPlaceholder="Search idempotency key or calling system"
        searchValue={search}
        onSearchChange={(value) => navigate(setFilter(state, 'search', value))}
        rows={items.length}
        total={Number(transfersQuery.data?.totalItemCount ?? 0)}
        filter={
          <FilterMenu activeCount={period === DEFAULT_TRANSFER_PERIOD ? 0 : 1} onClear={() => navigate(setFilter(state, 'period', DEFAULT_TRANSFER_PERIOD))}>
            <FilterField label="Period" hint="Recorded date, in UTC. 1 year is the widest window.">
              <Select options={TRANSFER_PERIOD_OPTIONS} value={period} className="w-full" onChange={(event) => navigate(setFilter(state, 'period', event.target.value))} />
            </FilterField>
          </FilterMenu>
        }
        pagination={{
          page: currentPage,
          pageCount: Number(transfersQuery.data?.pageCount ?? 1),
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
        {accountId && transfersQuery.isError ? (
          <FailedRead error={transfersQuery.error} onRetry={() => void transfersQuery.refetch()} />
        ) : (
          <TransfersTable
            rows={rows}
            loading={loading}
            placeholderRows={pageSize}
            emptyMessage={emptyMessage}
            orderBy={sort.field}
            desc={sort.desc}
            onSort={(field) => navigate({ ...state, sort: { field, desc: sort.field === field ? !sort.desc : false }, page: undefined })}
            selectedId={viewedId}
            onSelectRow={(row) => unsent.guard(() => navigate({ ...state, openRecordId: row.id === state.openRecordId ? undefined : row.id }))}
          />
        )}
      </TableCard>
      <Note>Amounts are shown at each currency&apos;s own precision, exactly as the ledger recorded them. Times are in UTC.</Note>

      {unsent.dialog}
    </div>
  );
}
