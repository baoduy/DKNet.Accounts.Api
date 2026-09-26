/**
 * DRK-1696 §3 row 13 — table + filters + paging + the open surface, whole view state
 * round-tripped through the page address (`lib/url-state.ts`) so a copied link reproduces
 * the same filter, sort, page and open panel (AT "A view is shared as a link").
 * DRK-1745 — laid out as Design/ui_kits/accounts-crud/Accounts.jsx: page header, acknowledgement,
 * table card with search, filter menu and pager, and one side panel for view, open and edit.
 */
'use client';

import type { JSX } from 'react';
import { Plus } from 'lucide-react';
import { AccountPanel } from '@/components/accounts/AccountPanel';
import { AccountsTable, type AccountsTableRow } from '@/components/accounts/AccountsTable';
import { ACCOUNTS_EMPTY, emptyMessage } from '@/components/feedback/empty';
import { FailedRead } from '@/components/feedback/RefusalAlert';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { useFlash } from '@/components/feedback/use-flash';
import { usePanelState } from '@/components/feedback/use-panel-state';
import { FilterField, FilterMenu } from '@/components/forms/FilterMenu';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { TableCard } from '@/components/ui/table-card';
import { Mono, Note } from '@/components/ui/text';
import { accountSearchError } from '@/lib/accounts/filters';
import type { AccountDto } from '@/lib/accounts/query';
import { useAccounts } from '@/lib/accounts/query';
import { useCurrencies, useDecimalPlaces } from '@/lib/query/currencies';
import { useAccountGroups } from '@/lib/query/groups';
import { useListViewState, withFilter } from '@/lib/url-state';
import { ACCOUNT_STATUSES } from './AccountForm';

/** The design kit's default page size, and the sizes its pager offers. */
const ACCOUNTS_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
/** `?open=new` — the panel's open-account form. */
const OPEN_NEW = 'new';
const FILTER_KEYS = ['group', 'currency', 'status'];

export interface AccountsScreenProps {
  grantedScopes: string[];
}

interface PanelTarget {
  open?: string;
  editing: boolean;
}

export function AccountsScreen({ grantedScopes }: AccountsScreenProps): JSX.Element {
  const [state, navigate] = useListViewState('/accounts');
  const flash = useFlash();

  const pageSize = state.pageSize ?? ACCOUNTS_PAGE_SIZE;
  const accountsQuery = useAccounts(state, pageSize);
  const currenciesQuery = useCurrencies();
  const decimalPlacesOf = useDecimalPlaces();
  const groupsQuery = useAccountGroups();
  const groups = groupsQuery.data ?? [];
  const currencies = currenciesQuery.data ?? [];

  const groupCodeById = new Map(groups.map((group) => [group.id, group.code]));
  const rows: AccountsTableRow[] = (accountsQuery.data?.items ?? []).map((account) => ({
    id: account.id,
    accountNumber: account.accountNumber,
    groupCode: groupCodeById.get(account.groupId),
    classification: account.classification,
    name: account.name,
    currency: account.currency,
    decimalPlaces: decimalPlacesOf(account.currency),
    balance: account.balance,
    availableBalance: account.availableBalance,
    openedOn: account.openedOn,
    status: account.status,
  }));

  const pageCount = accountsQuery.data?.pageCount ?? 1;
  const currentPage = state.page ?? 1;
  const canWrite = grantedScopes.includes('accounts.write');
  const open = state.openRecordId;
  // Which account is open lives in the address; whether it is being edited, in the panel's state.
  const panel = usePanelState();
  const editing = panel.mode === 'edit';
  const panelMode = open === OPEN_NEW ? 'open' : open ? (editing ? 'edit' : 'view') : null;
  const activeFilters = FILTER_KEYS.filter((key) => state.filters[key]).length;

  function showPanel(target: PanelTarget): void {
    panel.show(target.editing ? 'edit' : 'view');
    if (target.open !== state.openRecordId) navigate({ ...state, openRecordId: target.open });
  }

  /** Every way of closing or swapping the panel: an edited form asks before it is dropped. */
  function requestPanel(target: PanelTarget): void {
    panel.guard(() => showPanel(target));
  }

  function filterSelect(key: string, options: Array<{ value: string; label: string }>): JSX.Element {
    return (
      <Select
        options={[{ value: '', label: 'Any' }, ...options]}
        value={state.filters[key] ?? ''}
        onChange={(event) => navigate(withFilter(state, key, event.target.value))}
        className="w-full"
      />
    );
  }

  function statusChanged(account: AccountDto, status: string): void {
    flash.show(
      status === 'Closed'
        ? { title: 'Account closed', text: `${account.accountNumber} is closed. Its statement stays readable; no posting can be recorded against it.` }
        : { title: 'Account reopened', text: `${account.accountNumber} is active again. Postings can be recorded against it.` },
    );
  }

  return (
    <>
      <PageHeader
        icon="wallet"
        title="Accounts"
        description="Every account sits in one group, is denominated in one currency, and carries its own floor policy."
        actions={
          <ScopeGate scope="accounts.write" granted={canWrite}>
            <Button type="button" variant="primary" onClick={() => requestPanel({ open: OPEN_NEW, editing: false })}>
              <Plus size={14} aria-hidden="true" />
              Open account
            </Button>
          </ScopeGate>
        }
      />

      {flash.card}

      {currenciesQuery.isError ? <FailedRead error={currenciesQuery.error} onRetry={() => void currenciesQuery.refetch()} /> : null}

      <TableCard
        searchPlaceholder="Search number, name or reference"
        searchValue={state.filters.search ?? ''}
        onSearchChange={(value) => navigate(withFilter(state, 'search', value))}
        rows={rows.length}
        total={Number(accountsQuery.data?.totalItemCount ?? 0)}
        filter={
          <FilterMenu
            activeCount={activeFilters}
            onClear={() => navigate({ ...state, filters: state.filters.search ? { search: state.filters.search } : {}, page: undefined })}
          >
            <FilterField label="Group">{filterSelect('group', groups.map((group) => ({ value: group.id, label: group.code })))}</FilterField>
            <FilterField label="Currency">{filterSelect('currency', currencies.map((currency) => ({ value: currency.code, label: currency.code })))}</FilterField>
            <FilterField label="Status">{filterSelect('status', ACCOUNT_STATUSES.map((status) => ({ value: status, label: status })))}</FilterField>
          </FilterMenu>
        }
        pagination={{
          page: currentPage,
          pageCount,
          pageSize,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          onPageChange: (page) => navigate({ ...state, page }),
          onPageSizeChange: (size) => navigate({ ...state, pageSize: size, page: undefined }),
        }}
        panel={
          panelMode ? (
            <AccountPanel
              key={`${panelMode}:${open}`}
              mode={panelMode}
              accountId={panelMode === 'open' ? undefined : open}
              grantedScopes={grantedScopes}
              groups={groups}
              currencies={currencies}
              onClose={() => requestPanel({ editing: false })}
              onEdit={() => showPanel({ open, editing: true })}
              onOpened={(account) => {
                showPanel({ open: account.id, editing: false });
                flash.show({
                  title: 'Account opened',
                  text: `Opened ${account.accountNumber} in ${account.currency} at a zero balance. The account number was assigned by the service and is permanent.`,
                });
              }}
              onSaved={(account) => {
                showPanel({ open, editing: false });
                flash.show({
                  title: 'Changes saved',
                  text: `Updated ${account.accountNumber}. Group, account number, currency and external reference are unchanged; no posting was made.`,
                });
              }}
              onStatusChange={statusChanged}
              onDirtyChange={panel.onDirtyChange}
            />
          ) : null
        }
      >
        {accountsQuery.isError ? (
          <FailedRead error={accountsQuery.error} onRetry={() => void accountsQuery.refetch()} />
        ) : (
          <AccountsTable
            rows={rows}
            // A search too short to send makes no read (`toAccountsQuery`), so it is never loading.
            loading={accountsQuery.isPending && accountSearchError(state.filters.search ?? '') === null}
            emptyMessage={emptyMessage(ACCOUNTS_EMPTY, {
              total: Number(accountsQuery.data?.totalItemCount ?? 0),
              page: currentPage,
              filtered: Object.values(state.filters).some(Boolean),
            })}
            orderBy={state.sort?.field}
            desc={state.sort?.desc}
            onSort={(field) => navigate({ ...state, sort: { field, desc: state.sort?.field === field ? !state.sort.desc : false } })}
            selectedId={panelMode === 'open' ? null : open}
            onSelectRow={(row) => {
              if (row.id !== open || editing) requestPanel({ open: row.id, editing: false });
            }}
          />
        )}
      </TableCard>

      <Note>
        An account number is a link — it opens that account&apos;s page, with its records and its floor. Available and Opened carry no sort control: both are computed on the
        entity, so <Mono>orderBy</Mono> on either answers 400. Balances are reported per currency and are never combined into a single total.
      </Note>

      {panel.dialog}
    </>
  );
}
