'use client';

import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useId, useMemo, useState, useSyncExternalStore, type JSX, type ReactNode } from 'react';
import { FailedRead } from '@/components/feedback/RefusalAlert';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { AccountNumber } from '@/components/ledger/AccountNumber';
import { Money } from '@/components/ledger/Money';
import { TopBarSearch } from '@/components/shell/TopBarSearch';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TablePlaceholderRows, TableRow, fixedLayout, loadingTableProps } from '@/components/ui/table';
import { useCurrencies } from '@/lib/accounts/query';
import { fractionDigitsOf, shareBasisPoints } from '@/lib/api/money-json';
import { fetchLedgerBalances, type LedgerBalanceLine } from '@/lib/query/currencies';
import { ledgerBalancesKey, postingCountKey, recentRecordKey, statusCountsKey } from '@/lib/query/keys';
import {
  fetchPostingCount,
  fetchStatusCounts,
  lookupRecord,
  openedMonths,
  postingWeeks,
  type AccountDto,
  type AccountGroupDto,
  type LedgerRecordLookup,
  type PostingDto,
  type StatusCount,
  type StatusCountResource,
} from '@/lib/query/overview';
import { parseRecent, readRecentText, subscribeRecent, type RecentEntry, type RecentKind } from '@/lib/recent/store';

/**
 * DRK-1728 §3 row 6 — the Overview screen: the page's own search, the position by currency,
 * the status counts, postings per week, accounts opened per month, the stated gap and recently
 * viewed. Read-only: it offers no write action. Every figure is a count or total the service
 * returned (R1); a panel the operator has no permission for says so in place (never hidden), and
 * one panel's failed read never blanks another.
 */
export interface OverviewScreenProps {
  grantedScopes: string[];
  /** The signed-in operator's directory object id — keys their recently viewed list (§3a). */
  directoryObjectId: string;
}

const ACCOUNT_STATUSES = ['Active', 'Frozen', 'Dormant', 'Closed'];
const GROUP_STATUSES = ['Active', 'Closed'];
/** The ledger's currency count is unknown until it answers; the stand-in and a fresh ledger carry 3. */
const POSITION_PLACEHOLDER_ROWS = 3;

function formatCount(count: number): string {
  return count.toLocaleString('en-US');
}

/** The service's count for `status` — it spells statuses upper-case (§3a). */
function countOf(counts: StatusCount[], status: string): number | undefined {
  return counts.find((line) => line.status.toUpperCase() === status.toUpperCase())?.count;
}

function Panel({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  const headingId = useId();
  return (
    <Card role="region" aria-labelledby={headingId}>
      <h2 id={headingId} className="m-0 text-base font-semibold">
        {title}
      </h2>
      {children}
    </Card>
  );
}

function MissingScope({ scope }: { scope: string }): JSX.Element {
  return (
    <p className="flex flex-wrap items-center gap-2">
      <span>This panel needs a permission you do not hold.</span>
      <ScopeGate scope={scope} />
    </p>
  );
}

/**
 * A panel's table: its headings always, and its body once every read has answered — so `body`
 * may take each read's data as present. Until then `rows` placeholder rows stand in (DRK-1725
 * R1); a refused read is stated in the table's place with a way to try again, in this panel only.
 */
function Loaded({ results, head, columns, rows, body }: { results: UseQueryResult[]; head: ReactNode; columns: number; rows: number; body: () => ReactNode }): JSX.Element {
  const failed = results.filter((result) => result.isError);
  if (failed.length > 0) {
    return <FailedRead error={failed[0].error} onRetry={() => failed.forEach((result) => void result.refetch())} />;
  }
  const loading = results.some((result) => result.isPending);
  return (
    <Table {...fixedLayout(columns)} {...loadingTableProps(loading)}>
      <TableHeader>
        <TableRow>{head}</TableRow>
      </TableHeader>
      <TableBody>{loading ? <TablePlaceholderRows columns={columns} count={rows} /> : body()}</TableBody>
    </Table>
  );
}

export function OverviewScreen({ grantedScopes, directoryObjectId }: OverviewScreenProps): JSX.Element {
  const canReadAccounts = grantedScopes.includes('accounts.read');
  const canReadPostings = grantedScopes.includes('postings.read');
  // One clock reading per visit, so the week and month windows never shift mid-screen.
  const [now] = useState(() => new Date());

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <TopBarSearch grantedScopes={grantedScopes} variant="page" />
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <PositionPanel granted={canReadAccounts} />
        <div className="flex flex-col gap-5">
          <StatusPanel title="Accounts by status" resource="accounts" noun="Accounts" statuses={ACCOUNT_STATUSES} granted={canReadAccounts} />
          <StatusPanel title="Groups by status" resource="account-groups" noun="Groups" statuses={GROUP_STATUSES} granted={canReadAccounts} />
        </div>
        <PostingsPerWeekPanel granted={canReadPostings} now={now} />
        <AccountsOpenedPanel granted={canReadAccounts} now={now} />
        <RecentlyViewedPanel grantedScopes={grantedScopes} directoryObjectId={directoryObjectId} />
        <Card role="note" aria-label="Not shown">
          <h2 className="m-0 text-base font-semibold">Not shown</h2>
          <p>A total across all currencies is not shown, because the service has no exchange-rate source and currencies are never added together.</p>
        </Card>
      </div>
    </div>
  );
}

/** The row's available and held amounts compared within the row only — never across currencies. */
function PositionBar({ line }: { line: LedgerBalanceLine }): JSX.Element {
  const share = shareBasisPoints(line.available, line.held);
  const available = (share ?? 0) / 100;
  const held = share === null ? 0 : 100 - available;
  return (
    <div
      role="img"
      aria-label={`${line.currency}: ${Math.round(available)}% available, ${Math.round(held)}% held`}
      className="flex h-2 overflow-hidden rounded-sm bg-muted"
      style={{ width: '100%' }}
    >
      <div className="bg-chart-1" style={{ width: `${available}%` }} />
      <div className="bg-chart-4" style={{ width: `${held}%` }} />
    </div>
  );
}

function PositionPanel({ granted }: { granted: boolean }): JSX.Element {
  const balances = useQuery({ queryKey: ledgerBalancesKey(), queryFn: fetchLedgerBalances, enabled: granted });
  const currencies = useCurrencies();

  return (
    <Panel title="Position by currency">
      {granted ? (
        <Loaded
          results={[balances, currencies]}
          columns={5}
          rows={POSITION_PLACEHOLDER_ROWS}
          head={
            <>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Held</TableHead>
              <TableHead className="w-1/4">Available and held</TableHead>
            </>
          }
          body={() => {
            const decimals = new Map(currencies.data!.map((currency) => [currency.code, currency.decimalPlaces]));
            // Drawn at the currency's own scale; a currency the list does not know keeps the service's digits.
            const money = (line: LedgerBalanceLine, amount: string): JSX.Element => (
              <Money amount={amount} decimalPlaces={decimals.get(line.currency) ?? fractionDigitsOf(amount)} />
            );
            return balances.data!.map((line) => (
              <TableRow key={line.currency}>
                <TableCell className="font-semibold">{line.currency}</TableCell>
                <TableCell className="text-right">{money(line, line.balance)}</TableCell>
                <TableCell className="text-right">{money(line, line.available)}</TableCell>
                <TableCell className="text-right">{money(line, line.held)}</TableCell>
                <TableCell>
                  <PositionBar line={line} />
                </TableCell>
              </TableRow>
            ));
          }}
        />
      ) : (
        <MissingScope scope="accounts.read" />
      )}
      <p className="text-[length:var(--text-caption-size)] text-muted-foreground">Balances in different currencies are never added together.</p>
    </Panel>
  );
}

interface StatusPanelProps {
  title: string;
  resource: StatusCountResource;
  noun: string;
  statuses: string[];
  granted: boolean;
}

function StatusPanel({ title, resource, noun, statuses, granted }: StatusPanelProps): JSX.Element {
  const counts = useQuery({ queryKey: statusCountsKey(resource), queryFn: () => fetchStatusCounts(resource), enabled: granted });

  return (
    <Panel title={title}>
      {granted ? (
        <Loaded
          results={[counts]}
          columns={2}
          rows={statuses.length}
          head={
            <>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">{noun}</TableHead>
            </>
          }
          body={() =>
            statuses.map((status) => {
              const count = countOf(counts.data!, status);
              return (
                <TableRow key={status}>
                  <TableCell>{status}</TableCell>
                  <TableCell className="text-right tabular-nums">{count === undefined ? '—' : formatCount(count)}</TableCell>
                </TableRow>
              );
            })
          }
        />
      ) : (
        <MissingScope scope="accounts.read" />
      )}
    </Panel>
  );
}

/** A bar across `count`'s share of the largest figure in the chart — counts only, never money. */
function CountBar({ count, max, className }: { count: number; max: number; className: string }): JSX.Element {
  return <div aria-hidden="true" className={`h-2 rounded-sm ${className}`} style={{ width: `${max === 0 ? 0 : (count / max) * 100}%` }} />;
}

function PostingsPerWeekPanel({ granted, now }: { granted: boolean; now: Date }): JSX.Element {
  const weeks = postingWeeks(now);
  const counts = useQueries({
    queries: weeks.map((week) => ({ queryKey: postingCountKey(week), queryFn: () => fetchPostingCount(week), enabled: granted })),
  });

  return (
    <Panel title="Postings per week">
      {granted ? (
        <Loaded
          results={counts}
          columns={2}
          rows={weeks.length}
          head={
            <>
              <TableHead>Week (UTC)</TableHead>
              <TableHead className="w-1/2">Postings</TableHead>
            </>
          }
          body={() => {
            const max = Math.max(...counts.map((result) => result.data!));
            return weeks.map((week, index) => {
              const count = counts[index].data!;
              return (
                <TableRow key={week.from}>
                  <TableCell className="whitespace-nowrap">{`${week.from} to ${week.to}`}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CountBar count={count} max={max} className="bg-chart-1" />
                      <span className="tabular-nums">{formatCount(count)}</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            });
          }}
        />
      ) : (
        <MissingScope scope="postings.read" />
      )}
    </Panel>
  );
}

const STATUS_BAR_CLASSES: Record<string, string> = { Active: 'bg-chart-1', Frozen: 'bg-chart-2', Dormant: 'bg-chart-5', Closed: 'bg-chart-4' };

function AccountsOpenedPanel({ granted, now }: { granted: boolean; now: Date }): JSX.Element {
  const months = openedMonths(now);
  const counts = useQueries({
    queries: months.map((month) => {
      const window = { from: month.from, to: month.to };
      return { queryKey: statusCountsKey('accounts', window), queryFn: () => fetchStatusCounts('accounts', window), enabled: granted };
    }),
  });

  return (
    <Panel title="Accounts opened per month">
      {granted ? (
        <Loaded
          results={counts}
          columns={ACCOUNT_STATUSES.length + 2}
          rows={months.length}
          head={
            <>
              <TableHead>Month (UTC)</TableHead>
              {ACCOUNT_STATUSES.map((status) => (
                <TableHead key={status} className="text-right">
                  {status}
                </TableHead>
              ))}
              <TableHead className="w-1/4">By status</TableHead>
            </>
          }
          body={() => {
            // Each segment is scaled to a quarter of the largest single count, so the stacked bar's
            // length follows the month's total without the browser adding the service's counts up.
            const max = Math.max(...counts.flatMap((result) => result.data!.map((line) => line.count)));
            return months.map((month, index) => {
              const monthCounts = counts[index].data!;
              return (
                <TableRow key={month.from}>
                  <TableCell className="whitespace-nowrap">{month.label}</TableCell>
                  {ACCOUNT_STATUSES.map((status) => {
                    const count = countOf(monthCounts, status);
                    return (
                      <TableCell key={status} className="text-right tabular-nums">
                        {count === undefined ? '—' : formatCount(count)}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <div className="flex">
                      {ACCOUNT_STATUSES.map((status) => (
                        <CountBar key={status} count={countOf(monthCounts, status) ?? 0} max={max * ACCOUNT_STATUSES.length} className={STATUS_BAR_CLASSES[status]} />
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              );
            });
          }}
        />
      ) : (
        <MissingScope scope="accounts.read" />
      )}
    </Panel>
  );
}

const RECENT_KINDS: Record<RecentKind, { noun: string; scope: string; path: (id: string) => string }> = {
  Account: { noun: 'account', scope: 'accounts.read', path: (id) => `/api/ledger/accounts/${id}` },
  AccountGroup: { noun: 'group', scope: 'accounts.read', path: (id) => `/api/ledger/account-groups/${id}` },
  Posting: { noun: 'posting', scope: 'postings.read', path: (id) => `/api/ledger/postings/${id}` },
};

function RecentlyViewedPanel({ grantedScopes, directoryObjectId }: { grantedScopes: string[]; directoryObjectId: string }): JSX.Element {
  // The list lives in the browser: the server render draws nothing for it (`undefined`).
  const text = useSyncExternalStore(subscribeRecent, () => readRecentText(directoryObjectId), () => undefined);
  const entries = useMemo(() => (text === undefined ? null : parseRecent(text)), [text]);
  const lookups = useQueries({
    queries: (entries ?? []).map((entry) => ({
      queryKey: recentRecordKey(entry.kind, entry.id),
      queryFn: () => lookupRecord<AccountDto | AccountGroupDto | PostingDto>(RECENT_KINDS[entry.kind].path(entry.id)),
      enabled: grantedScopes.includes(RECENT_KINDS[entry.kind].scope),
    })),
  });

  return (
    <Panel title="Recently viewed">
      {entries === null ? null : entries.length === 0 ? (
        <p className="text-muted-foreground">Records you open will appear here.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry, index) => (
            <li key={`${entry.kind}:${entry.id}`} className="flex flex-wrap items-center gap-2">
              <RecentEntryLine entry={entry} lookup={lookups[index]} granted={grantedScopes.includes(RECENT_KINDS[entry.kind].scope)} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function RecentEntryLine({ entry, lookup, granted }: { entry: RecentEntry; lookup: UseQueryResult<LedgerRecordLookup<unknown>>; granted: boolean }): JSX.Element {
  const { noun, scope } = RECENT_KINDS[entry.kind];
  if (!granted || lookup.data?.state === 'forbidden') {
    return (
      <>
        <span>{`You may no longer read this ${noun}.`}</span>
        <ScopeGate scope={scope} />
      </>
    );
  }
  if (lookup.isError) return <FailedRead error={lookup.error} onRetry={() => void lookup.refetch()} />;
  if (lookup.isPending) return <Skeleton className="w-48" />;
  if (lookup.data.state === 'notFound') return <span>{`This ${noun} can no longer be found.`}</span>;
  const record = lookup.data.record;
  if (entry.kind === 'Account') {
    const account = record as AccountDto;
    return (
      <>
        <AccountNumber value={account.accountNumber} href={`/accounts/${encodeURIComponent(account.accountNumber)}`} />
        <span>{account.name}</span>
      </>
    );
  }
  if (entry.kind === 'AccountGroup') {
    const group = record as AccountGroupDto;
    return (
      <>
        <a className="font-mono text-primary underline" href={`/groups?open=${entry.id}`}>
          {group.code}
        </a>
        <span>{group.name}</span>
      </>
    );
  }
  return (
    <>
      <a className="font-mono text-primary underline" href={`/records?open=${entry.id}`}>
        {(record as PostingDto).postingNumber}
      </a>
      <span className="text-muted-foreground">Posting</span>
    </>
  );
}
