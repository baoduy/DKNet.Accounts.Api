/**
 * DRK-1696 §3 row 7 — the account detail screen's own data-fetching, mirroring
 * `AccountsScreen`'s split between a smart screen (owns the queries) and dumb presentation
 * (`AccountDetail`, unit-tested with no query provider). `/accounts/[account]/page.tsx`
 * mounts this; it stays thin (R6).
 *
 * DRK-1725 §3 — each part owns its read: while the account is read the screen is drawn in its
 * final shape with placeholders, a failed read is stated where its content would be, and the
 * statement's period and page live in the address, so a link reproduces them.
 */
'use client';

import { useSearchParams } from 'next/navigation';
import { useLayoutEffect, useState, type JSX } from 'react';
import { emptyMessage, NO_POSTINGS_ON_ACCOUNT, postingsEmpty } from '@/components/feedback/empty';
import { FailedRead } from '@/components/feedback/RefusalAlert';
import { AccountDetail, type AccountDetailAccount } from './AccountDetail';
import type { PostingsPanelFilter, PostingsPanelRow } from './PostingsPanel';
import { fractionDigitsOf } from '@/lib/api/money-json';
import { useAccount, useAccountBalance, useAccountGroups, useCurrencies, usePostings } from '@/lib/accounts/query';
import { defaultPostingsFilter, postingPeriodError, type PostingsFilterState } from '@/lib/accounts/postings-filter';
import { pushRecent } from '@/lib/recent/store';

/** The statement's page size — the console's list page size. */
export const STATEMENT_PAGE_SIZE = 10;

export interface AccountDetailScreenProps {
  accountNumber: string;
  grantedScopes: string[];
  /** Keys the operator's recently viewed list (DRK-1728 §3 row 8); unset, nothing is kept. */
  directoryObjectId?: string;
}

/** The statement's view as the address carries it: `?from=&to=` and `?page=`. */
interface StatementView {
  from?: string;
  to?: string;
  page?: number;
}

function readView(params: URLSearchParams): StatementView {
  const page = Number(params.get('page'));
  return { from: params.get('from') ?? undefined, to: params.get('to') ?? undefined, page: Number.isInteger(page) && page > 0 ? page : undefined };
}

function viewSearch(view: StatementView): string {
  const params = new URLSearchParams();
  if (view.from !== undefined) params.set('from', view.from);
  if (view.to !== undefined) params.set('to', view.to);
  if (view.page !== undefined) params.set('page', String(view.page));
  const search = params.toString();
  return search ? `?${search}` : '';
}

const NO_NARROWING: PostingsPanelFilter = { direction: '', category: '', status: '' };

export function AccountDetailScreen({ accountNumber, grantedScopes, directoryObjectId }: AccountDetailScreenProps): JSX.Element {
  const searchParams = useSearchParams();
  const [view, setView] = useState<StatementView>(() => readView(searchParams));
  const [narrowing, setNarrowing] = useState<PostingsPanelFilter>(NO_NARROWING);
  const [defaults] = useState(() => defaultPostingsFilter());

  // Same reasoning as `AccountsScreen.navigate`: local state first, the address bar mirrored
  // through the History API, so rapid changes never race a router round trip.
  function navigate(next: StatementView): void {
    setView(next);
    window.history.pushState(null, '', `${window.location.pathname}${viewSearch(next)}`);
  }

  const filter: PostingsFilterState = { ...defaults, ...narrowing, from: view.from ?? defaults.from, to: view.to ?? defaults.to, pageNumber: view.page };

  const accountQuery = useAccount(accountNumber);
  const account = accountQuery.data?.account;
  const accountId = account?.id ?? '';

  const balanceQuery = useAccountBalance(accountId);
  const currenciesQuery = useCurrencies();
  const groupsQuery = useAccountGroups();
  const postingsQuery = usePostings(accountId, filter, STATEMENT_PAGE_SIZE);

  // Kept as the detail is drawn — before paint, so an operator who moves straight on still has it.
  const openedId = accountQuery.data?.found ? accountId : '';
  useLayoutEffect(() => {
    if (directoryObjectId && openedId) pushRecent(directoryObjectId, 'Account', openedId);
  }, [directoryObjectId, openedId]);

  // A refused lookup (401, 403, 500, ...) shows the service's own wording where the account
  // would be — 404 is the only "not found" (DRK-1704 finding 5); `useAccount` already draws that line.
  if (accountQuery.isError) {
    return <FailedRead error={accountQuery.error} onRetry={() => void accountQuery.refetch()} />;
  }

  if (accountQuery.isSuccess && (!accountQuery.data.found || !account)) {
    return <AccountDetail account={null} />;
  }

  // No amount is drawn until the currency's own scale is known — never a guessed 2 places. A
  // refused currency read is stated on its own, and amounts are then drawn at the service's digits.
  const scale = account ? currenciesQuery.data?.find((currency) => currency.code === account.currency)?.decimalPlaces : undefined;
  const decimalPlaces = scale ?? (account && currenciesQuery.isError ? fractionDigitsOf(account.balance) : undefined);
  const balance = balanceQuery.data;
  const groupName = (groupsQuery.data ?? []).find((group) => group.id === account?.groupId)?.name ?? '';
  const metadata = (account?.metadata ?? undefined) as Record<string, string> | undefined;

  const detailAccount: AccountDetailAccount | undefined = account
    ? {
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
      }
    : undefined;

  const postingRows: PostingsPanelRow[] = (postingsQuery.data?.items ?? []).map((posting) => ({
    id: posting.id,
    postingNumber: posting.postingNumber,
    direction: posting.direction,
    amount: posting.amount,
    currency: posting.currency,
    decimalPlaces: scale ?? fractionDigitsOf(posting.amount),
    category: posting.category,
    status: posting.status,
    description: posting.description ?? '',
    effectiveDate: posting.effectiveDate ?? '',
    reversedByPostingId: posting.reversedByPostingId,
    reversesPostingId: posting.reversesPostingId,
  }));

  // A period the service would refuse is never sent (`toPostingsQuery`): it is stated in the
  // table's place, never left loading.
  const periodError = postingPeriodError(filter.from, filter.to);

  // "Nothing yet" only when the account has had no posting at all (`streamPosition` is its posting
  // count) and no period was asked for; otherwise an empty period says which period it was.
  const neverPosted = account !== undefined && Number(account.streamPosition) === 0 && view.from === undefined && view.to === undefined;
  const statementEmpty =
    periodError ??
    emptyMessage(postingsEmpty(filter.from, filter.to, neverPosted ? NO_POSTINGS_ON_ACCOUNT : undefined), {
      total: Number(postingsQuery.data?.totalItemCount ?? 0),
      page: view.page ?? 1,
      filtered: Boolean(narrowing.direction || narrowing.category || narrowing.status),
    });

  return (
    <>
      {currenciesQuery.isError ? <FailedRead error={currenciesQuery.error} onRetry={() => void currenciesQuery.refetch()} /> : null}
      <AccountDetail
        account={detailAccount}
        accountId={accountId || undefined}
        grantedScopes={grantedScopes}
        postings={postingRows}
        postingsLoading={(periodError === null && postingsQuery.isPending) || currenciesQuery.isPending}
        postingsFailure={postingsQuery.isError ? { error: postingsQuery.error, onRetry: () => void postingsQuery.refetch() } : undefined}
        postingsEmptyMessage={statementEmpty}
        postingsPage={view.page ?? 1}
        postingsPageCount={Number(postingsQuery.data?.pageCount ?? 1)}
        onPostingsPageChange={(page) => navigate({ ...view, page })}
        postingsFrom={filter.from}
        postingsTo={filter.to}
        postingsFilter={narrowing}
        onPostingsFilterChange={(next) => {
          setNarrowing(next);
          if (view.page !== undefined) navigate({ ...view, page: undefined });
        }}
        onPostingsPeriodChange={(from, to) => navigate({ from, to })}
      />
    </>
  );
}
