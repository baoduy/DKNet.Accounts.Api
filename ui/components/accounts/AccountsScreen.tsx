/**
 * DRK-1696 §3 row 13 — table + filters + paging + the open surface, whole view state
 * round-tripped through the page address (`lib/url-state.ts`) so a copied link reproduces
 * the same filter, sort and page (AT "A view is shared as a link").
 */
'use client';

import { useSearchParams } from 'next/navigation';
import { useState, type JSX } from 'react';
import { AccountForm, type AccountFormValues } from '@/components/accounts/AccountForm';
import { AccountsTable, type AccountsTableRow } from '@/components/accounts/AccountsTable';
import { RefusalAlert, type LedgerError } from '@/components/feedback/RefusalAlert';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ledgerErrorTraceId, toLedgerError } from '@/lib/api/refusal';
import { useAccountGroups, useAccounts, useCurrencies } from '@/lib/accounts/query';
import { useOpenAccount } from '@/lib/accounts/mutations';
import { parseListViewState, toListViewSearchParams, type ListViewState } from '@/lib/url-state';

/** ponytail: small enough to keep the paging control exercised against a small fixture; raise once a real operator's account count calls for it. */
const ACCOUNTS_PAGE_SIZE = 2;

export interface AccountsScreenProps {
  grantedScopes: string[];
}

function setFilter(state: ListViewState, key: string, value: string): ListViewState {
  const filters = { ...state.filters };
  if (value) filters[key] = value;
  else delete filters[key];
  return { ...state, filters, page: undefined };
}

export function AccountsScreen({ grantedScopes }: AccountsScreenProps): JSX.Element {
  const searchParams = useSearchParams();
  const [state, setState] = useState<ListViewState>(() => parseListViewState(searchParams));
  const [formOpen, setFormOpen] = useState(false);

  // Next's `router.push` updates the address bar asynchronously (a real round trip to fetch
  // the destination's RSC payload) — a rapid sequence of clicks (filter, then sort, then
  // page) would race that latency and drop whichever change lands first. View state instead
  // lives in local state (synchronous, always builds on the change just made) and is mirrored
  // to the address bar via the History API directly, so a copied link still reproduces it.
  function navigate(next: ListViewState): void {
    setState(next);
    window.history.pushState(null, '', `/accounts?${toListViewSearchParams(next).toString()}`);
  }

  const accountsQuery = useAccounts(state, ACCOUNTS_PAGE_SIZE);
  const currenciesQuery = useCurrencies();
  const groupsQuery = useAccountGroups();
  const openAccount = useOpenAccount();
  const [openErrors, setOpenErrors] = useState<LedgerError[]>([]);

  const decimalPlacesByCurrency = new Map((currenciesQuery.data ?? []).map((currency) => [currency.code, currency.decimalPlaces]));
  const rows: AccountsTableRow[] = (accountsQuery.data?.items ?? []).map((account) => ({
    accountNumber: account.accountNumber,
    name: account.name,
    currency: account.currency,
    decimalPlaces: decimalPlacesByCurrency.get(account.currency) ?? 2,
    balance: account.balance,
    availableBalance: account.availableBalance,
    openedOn: account.openedOn,
    status: account.status,
  }));

  const pageCount = accountsQuery.data?.pageCount ?? 1;
  const currentPage = state.page ?? 1;
  const canWrite = grantedScopes.includes('accounts.write');

  async function handleOpenAccount(values: AccountFormValues): Promise<void> {
    const result = await openAccount.mutate({
      groupId: values.groupId!,
      name: values.name,
      currency: values.currency!,
      classification: values.classification!,
      permittedToGoNegative: values.floor.permittedToGoNegative,
      overdraftLimit: values.floor.overdraftLimit,
      minimumBalance: values.floor.minimumBalance,
    });
    if (result.ok) {
      // Stays open rather than auto-closing: the operator can open another account right
      // after, and the group/currency lists it just offered remain checkable on screen.
      setOpenErrors([]);
    } else {
      setOpenErrors(result.errors ?? []);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <label className="flex flex-col gap-1">
          Search accounts
          <Input
            aria-label="Search accounts"
            value={state.filters.search ?? ''}
            onChange={(event) => navigate(setFilter(state, 'search', event.target.value))}
          />
        </label>

        {!formOpen ? (
          <label className="flex flex-col gap-1">
            Currency filter
            <select
              aria-label="Currency filter"
              value={state.filters.currency ?? ''}
              onChange={(event) => navigate(setFilter(state, 'currency', event.target.value))}
            >
              <option value="">All currencies</option>
              {(currenciesQuery.data ?? []).map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <ScopeGate scope="accounts.write" granted={canWrite} style={{ marginLeft: 'auto' }}>
          <Button onClick={() => setFormOpen(true)}>Open account</Button>
        </ScopeGate>
      </div>

      {accountsQuery.isError ? (
        <RefusalAlert errors={[toLedgerError(accountsQuery.error)]} traceId={ledgerErrorTraceId(accountsQuery.error)} />
      ) : (
        <AccountsTable
          rows={rows}
          orderBy={state.sort?.field}
          desc={state.sort?.desc}
          onSort={(field) => navigate({ ...state, sort: { field, desc: state.sort?.field === field ? !state.sort.desc : false } })}
        />
      )}

      <div className="flex items-center gap-2">
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
          <button
            key={page}
            type="button"
            aria-current={page === currentPage ? 'page' : undefined}
            onClick={() => navigate({ ...state, page })}
          >
            Page {page}
          </button>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogTitle>Open account</DialogTitle>
          <RefusalAlert errors={openErrors.filter((error) => !error.field)} />
          <AccountForm
            mode="open"
            account={{
              accountNumber: '',
              groupName: '',
              name: '',
              currency: '',
              classification: 'Asset',
              externalReference: '',
              notes: '',
              overdraftLimit: null,
              minimumBalance: null,
              permittedToGoNegative: false,
            }}
            groups={(groupsQuery.data ?? []).map((group) => ({ value: group.id, label: group.name }))}
            currencies={(currenciesQuery.data ?? []).map((currency) => ({ value: currency.code, label: currency.code }))}
            errors={openErrors}
            onSubmit={handleOpenAccount}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
