/**
 * DRK-1696 §3 row 7 — the account detail screen's own data-fetching, mirroring
 * `AccountsScreen`'s split between a smart screen (owns the queries) and dumb presentation
 * (`AccountDetail`, unit-tested with no query provider). `/accounts/[account]/page.tsx`
 * mounts this; it stays thin (R6).
 *
 * DRK-1725 §3 — each part owns its read: while the account is read the screen is drawn in its
 * final shape with placeholders, a failed read is stated where its content would be, and the
 * statement's period and page live in the address, so a link reproduces them.
 *
 * DRK-1745 §3 rows 3, 6 — the period is one choice (`?period=7d`, opening on 30 days), the pager
 * carries its page size (`?pageSize=`), and the side panel's content is in the address too:
 * `?open=<posting id>`, `?open=new` (record a posting) or `?open=edit` (edit the account).
 */
'use client';

import { useLayoutEffect, useState, type JSX } from 'react';
import { emptyMessage, NO_POSTINGS_ON_ACCOUNT, postingsEmpty } from '@/components/feedback/empty';
import { FailedRead } from '@/components/feedback/RefusalAlert';
import { AccountDetail, type AccountDetailAccount } from './AccountDetail';
import type { PostingsPanelFilter, PostingsPanelRow } from './PostingsPanel';
import { fractionDigitsOf } from '@/lib/api/money-json';
import { useAccount, useAccountBalance, usePosting, usePostings } from '@/lib/accounts/query';
import { DEFAULT_POSTING_PERIOD, MIN_POSTING_SEARCH_LENGTH, postingPeriod, postingPeriodRange, type PostingsFilterState } from '@/lib/accounts/postings-filter';
import { useCurrencies, useDecimalPlaces } from '@/lib/query/currencies';
import { useAccountGroups } from '@/lib/query/groups';
import { pushRecent } from '@/lib/recent/store';
import { useAddressState } from '@/lib/url-state';

/** The statement's page size — the console's list page size. */
export const STATEMENT_PAGE_SIZE = 10;

export interface AccountDetailScreenProps {
  accountNumber: string;
  grantedScopes: string[];
  /** Keys the operator's recently viewed list (DRK-1728 §3 row 8); unset, nothing is kept. */
  directoryObjectId?: string;
}

/** The statement's view as the address carries it: `?period=`, `?page=`, `?pageSize=` and `?open=`. */
interface StatementView {
  period?: string;
  page?: number;
  pageSize?: number;
  open?: string;
}

function positive(value: string | null): number | undefined {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function readView(params: URLSearchParams): StatementView {
  const period = params.get('period');
  return {
    period: period ? postingPeriod(period) : undefined,
    page: positive(params.get('page')),
    pageSize: positive(params.get('pageSize')),
    open: params.get('open') ?? undefined,
  };
}

/** The statement's address: this page, with the view's own query. */
function viewHref(view: StatementView): string {
  return `${window.location.pathname}${viewSearch(view)}`;
}

function viewSearch(view: StatementView): string {
  const params = new URLSearchParams();
  if (view.period !== undefined && view.period !== DEFAULT_POSTING_PERIOD) params.set('period', view.period);
  if (view.page !== undefined) params.set('page', String(view.page));
  if (view.pageSize !== undefined) params.set('pageSize', String(view.pageSize));
  if (view.open !== undefined) params.set('open', view.open);
  const search = params.toString();
  return search ? `?${search}` : '';
}

const NO_NARROWING: PostingsPanelFilter = { direction: '', category: '', status: '' };

export function AccountDetailScreen({ accountNumber, grantedScopes, directoryObjectId }: AccountDetailScreenProps): JSX.Element {
  const [view, navigate] = useAddressState(readView, viewHref);
  const [narrowing, setNarrowing] = useState<PostingsPanelFilter>(NO_NARROWING);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ field: string; desc: boolean } | undefined>(undefined);
  const [now] = useState(() => new Date());

  const period = postingPeriod(view.period);
  const pageSize = view.pageSize ?? STATEMENT_PAGE_SIZE;
  const filter: PostingsFilterState = {
    ...postingPeriodRange(period, now),
    ...narrowing,
    search: search || undefined,
    orderBy: sort?.field,
    desc: sort?.desc,
    pageNumber: view.page,
  };
  // A too-short search makes no read at all (`toPostingsQuery`), so it is never left loading.
  const queryable = !(filter.search && filter.search.length < MIN_POSTING_SEARCH_LENGTH);
  // A changed narrowing or search starts again from its first page.
  const refilter = (): void => {
    if (view.page !== undefined) navigate({ ...view, page: undefined });
  };

  const accountQuery = useAccount(accountNumber);
  const account = accountQuery.data?.account;
  const accountId = account?.id ?? '';

  const balanceQuery = useAccountBalance(accountId);
  const currenciesQuery = useCurrencies();
  const decimalPlacesOf = useDecimalPlaces();
  const groupsQuery = useAccountGroups();
  const postingsQuery = usePostings(accountId, filter, pageSize);
  const listedPosting = postingsQuery.data?.items.find((posting) => posting.id === view.open);
  const openQuery = usePosting(view.open && view.open !== 'new' && view.open !== 'edit' && !listedPosting ? view.open : undefined);
  // Only a posting on this account opens here — never another account's, whatever the address says.
  const openedPosting = listedPosting ?? openQuery.data;
  const openPosting = openedPosting && openedPosting.accountId === accountId ? openedPosting : undefined;

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
    return <AccountDetail account={null} accountNumber={accountNumber} />;
  }

  // No amount is drawn until the currency's own scale is known — never a guessed 2 places. A
  // refused currency read is stated on its own, and amounts are then drawn at the service's digits.
  const scale = account ? decimalPlacesOf(account.currency) : undefined;
  const decimalPlaces = scale ?? (account && currenciesQuery.isError ? fractionDigitsOf(account.balance) : undefined);
  const balance = balanceQuery.data;
  const group = (groupsQuery.data ?? []).find((candidate) => candidate.id === account?.groupId);
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
        // No default of '0' while the balance read is pending or refused (DRK-1704 finding 5):
        // only the service's own figure is ever drawn (DRK-1760 §3 row 11).
        floor: balance?.floor,
        floorFailed: balanceQuery.isError,
        status: account.status,
        permittedToGoNegative: account.permittedToGoNegative,
        overdraftLimit: account.overdraftLimit ?? null,
        minimumBalance: account.minimumBalance ?? null,
        externalReference: account.externalReference ?? '',
        classification: account.classification,
        groupName: group?.name ?? '',
        groupCode: group?.code,
        openedOn: account.openedOn,
        notes: metadata?.notes ?? '',
        metadata,
      }
    : undefined;

  const postingRows: PostingsPanelRow[] = (queryable ? (postingsQuery.data?.items ?? []) : []).map((posting) => ({
    id: posting.id,
    postingNumber: posting.postingNumber,
    direction: posting.direction,
    amount: posting.amount,
    currency: posting.currency,
    decimalPlaces: scale ?? fractionDigitsOf(posting.amount),
    category: posting.category,
    status: posting.status,
    description: posting.description,
    effectiveDate: posting.effectiveDate,
    reversedByPostingId: posting.reversedByPostingId,
    reversesPostingId: posting.reversesPostingId,
  }));

  // "Nothing yet" only when the account has had no posting at all (`streamPosition` is its posting
  // count) and no period was asked for; otherwise an empty period says which period it was.
  const neverPosted = account !== undefined && Number(account.streamPosition) === 0 && view.period === undefined;
  const statementEmpty = emptyMessage(postingsEmpty(filter.from, filter.to, neverPosted ? NO_POSTINGS_ON_ACCOUNT : undefined), {
    total: Number(postingsQuery.data?.totalItemCount ?? 0),
    page: view.page ?? 1,
    filtered: Boolean(narrowing.direction || narrowing.category || narrowing.status || filter.search),
  });

  return (
    <>
      {currenciesQuery.isError ? <FailedRead error={currenciesQuery.error} onRetry={() => void currenciesQuery.refetch()} /> : null}
      <AccountDetail
        account={detailAccount}
        accountNumber={accountNumber}
        accountId={accountId || undefined}
        grantedScopes={grantedScopes}
        postings={postingRows}
        postingsLoading={(queryable && postingsQuery.isPending) || currenciesQuery.isPending}
        postingsFailure={postingsQuery.isError ? { error: postingsQuery.error, onRetry: () => void postingsQuery.refetch() } : undefined}
        postingsEmptyMessage={statementEmpty}
        postingsPage={view.page ?? 1}
        postingsPageCount={Number(postingsQuery.data?.pageCount ?? 1)}
        postingsPageSize={pageSize}
        postingsTotal={queryable ? Number(postingsQuery.data?.totalItemCount ?? 0) : 0}
        onPostingsPageChange={(page) => navigate({ ...view, page })}
        onPostingsPageSizeChange={(size) => navigate({ ...view, pageSize: size, page: undefined })}
        postingsPeriod={period}
        onPostingsPeriodChange={(next) => navigate({ ...view, period: next, page: undefined })}
        postingsFilter={narrowing}
        onPostingsFilterChange={(next) => {
          setNarrowing(next);
          refilter();
        }}
        postingsSearch={search}
        onPostingsSearchChange={(next) => {
          setSearch(next);
          refilter();
        }}
        postingsOrderBy={sort?.field}
        postingsDesc={sort?.desc}
        onPostingsSort={(field) => setSort({ field, desc: sort?.field === field ? !sort.desc : false })}
        open={view.open}
        onOpenChange={(open) => navigate({ ...view, open })}
        openPosting={openPosting}
      />
    </>
  );
}
