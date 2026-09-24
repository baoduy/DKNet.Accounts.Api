/**
 * DRK-1696 §3 row 7 — the account detail screen's own data-fetching, mirroring
 * `AccountsScreen`'s split between a smart screen (owns the queries) and dumb presentation
 * (`AccountDetail`, unit-tested with no query provider). `/accounts/[account]/page.tsx`
 * mounts this; it stays thin (R6).
 */
'use client';

import { useState, type JSX } from 'react';
import { RefusalAlert } from '@/components/feedback/RefusalAlert';
import { AccountDetail, type AccountDetailAccount } from './AccountDetail';
import type { PostingsPanelRow } from './PostingsPanel';
import { ledgerErrorTraceId, toLedgerError } from '@/lib/api/refusal';
import { useAccount, useAccountBalance, useAccountGroups, useCurrencies, usePostings } from '@/lib/accounts/query';
import { defaultPostingsFilter, type PostingsFilterState } from '@/lib/accounts/postings-filter';

export interface AccountDetailScreenProps {
  accountNumber: string;
  grantedScopes: string[];
}

export function AccountDetailScreen({ accountNumber, grantedScopes }: AccountDetailScreenProps): JSX.Element {
  const [filter, setFilter] = useState<PostingsFilterState>(() => defaultPostingsFilter());

  const accountQuery = useAccount(accountNumber);
  const account = accountQuery.data?.account;
  const accountId = account?.id ?? '';

  const balanceQuery = useAccountBalance(accountId);
  const currenciesQuery = useCurrencies();
  const groupsQuery = useAccountGroups();
  const postingsQuery = usePostings(accountId, filter);

  if (accountQuery.isPending) {
    return <p>Loading…</p>;
  }

  // A refused lookup (401, 403, 500, ...) shows the service's own wording — 404 is the only
  // "not found" (DRK-1704 finding 5); `useAccount` already draws that line.
  if (accountQuery.isError) {
    return <RefusalAlert errors={[toLedgerError(accountQuery.error)]} traceId={ledgerErrorTraceId(accountQuery.error)} />;
  }

  if (!accountQuery.data?.found || !account) {
    return <AccountDetail account={null} />;
  }

  // No amount is drawn until the currency's own scale is known — never a guessed 2 places.
  const decimalPlaces = currenciesQuery.data?.find((currency) => currency.code === account.currency)?.decimalPlaces;
  const balance = balanceQuery.data;
  const groupName = (groupsQuery.data ?? []).find((group) => group.id === account.groupId)?.name ?? '';
  const metadata = (account.metadata ?? undefined) as Record<string, string> | undefined;

  const detailAccount: AccountDetailAccount = {
    accountNumber: account.accountNumber,
    name: account.name,
    currency: account.currency,
    decimalPlaces,
    balance: balance?.balance ?? account.balance,
    availableBalance: balance?.availableBalance ?? account.availableBalance,
    heldAmount: balance?.heldAmount ?? account.heldAmount,
    // No default of '0' while the balance read is pending or refused (DRK-1704 finding 5) —
    // `FloorLine` falls back to its own `computeFloor` off the account's own floor policy
    // fields when the service hasn't stated the exact figure yet.
    floor: balance?.floor,
    status: account.status,
    permittedToGoNegative: account.permittedToGoNegative,
    overdraftLimit: account.overdraftLimit ?? null,
    minimumBalance: account.minimumBalance ?? null,
    externalReference: account.externalReference ?? '',
    classification: account.classification,
    groupName,
    notes: metadata?.notes ?? '',
    metadata,
  };

  const postingRows: PostingsPanelRow[] = (postingsQuery.data?.items ?? []).map((posting) => ({
    id: posting.id,
    postingNumber: posting.postingNumber,
    direction: posting.direction,
    amount: posting.amount,
    currency: posting.currency,
    decimalPlaces,
    category: posting.category,
    status: posting.status,
    description: posting.description ?? '',
    effectiveDate: posting.effectiveDate ?? '',
  }));

  return (
    <>
      {currenciesQuery.isError ? (
        <RefusalAlert errors={[toLedgerError(currenciesQuery.error)]} traceId={ledgerErrorTraceId(currenciesQuery.error)} />
      ) : null}
      <AccountDetail
        account={detailAccount}
        accountId={account.id}
        grantedScopes={grantedScopes}
        postings={postingRows}
        postingsFrom={filter.from}
        postingsTo={filter.to}
        postingsFilter={{ direction: filter.direction, category: filter.category, status: filter.status }}
        onPostingsFilterChange={(next) => setFilter((current) => ({ ...current, ...next }))}
        onPostingsPeriodChange={(from, to) => setFilter((current) => ({ ...current, from, to }))}
      />
    </>
  );
}
