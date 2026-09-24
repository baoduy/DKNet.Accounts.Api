/**
 * DRK-1696 §3 row 7 — the account detail screen's own data-fetching, mirroring
 * `AccountsScreen`'s split between a smart screen (owns the queries) and dumb presentation
 * (`AccountDetail`, unit-tested with no query provider). `/accounts/[account]/page.tsx`
 * mounts this; it stays thin (R6).
 */
'use client';

import { useState, type JSX } from 'react';
import { AccountDetail, type AccountDetailAccount } from './AccountDetail';
import type { PostingsPanelRow } from './PostingsPanel';
import { useAccount, useAccountBalance, useCurrencies, usePostings } from '@/lib/accounts/query';
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
  const postingsQuery = usePostings(accountId, filter);

  if (accountQuery.isPending) {
    return <p>Loading…</p>;
  }

  if (!accountQuery.data?.found || !account) {
    return <AccountDetail account={null} />;
  }

  const decimalPlaces = (currenciesQuery.data ?? []).find((currency) => currency.code === account.currency)?.decimalPlaces ?? 2;
  const balance = balanceQuery.data;

  const detailAccount: AccountDetailAccount = {
    accountNumber: account.accountNumber,
    name: account.name,
    currency: account.currency,
    decimalPlaces,
    balance: balance?.balance ?? account.balance,
    availableBalance: balance?.availableBalance ?? account.availableBalance,
    heldAmount: balance?.heldAmount ?? account.heldAmount,
    floor: balance?.floor ?? '0',
    status: account.status,
    permittedToGoNegative: account.permittedToGoNegative,
    overdraftLimit: account.overdraftLimit ?? null,
    minimumBalance: account.minimumBalance ?? null,
    externalReference: account.externalReference ?? '',
    classification: account.classification,
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
    <AccountDetail
      account={detailAccount}
      accountId={account.id}
      grantedScopes={grantedScopes}
      postings={postingRows}
      postingsFrom={filter.from}
      postingsTo={filter.to}
      postingsFilter={{ direction: filter.direction, category: filter.category, status: filter.status }}
      onPostingsFilterChange={(next) => setFilter((current) => ({ ...current, ...next }))}
    />
  );
}
