'use client';

import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useId, useMemo, useState, useSyncExternalStore, type JSX, type ReactNode } from 'react';
import { ArrowRight, Plus, Wallet, type LucideIcon } from 'lucide-react';
import { FailedRead } from '@/components/feedback/RefusalAlert';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { AccountNumber } from '@/components/ledger/AccountNumber';
import { Money } from '@/components/ledger/Money';
import { PageHeader } from '@/components/shell/PageHeader';
import { TopBarSearch } from '@/components/shell/TopBarSearch';
import { Button } from '@/components/ui/button';
import { Card, CardBar } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TablePlaceholderRows, TableRow, loadingTableProps } from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';
import { Caption, Label, Mono, Note } from '@/components/ui/text';
import { fractionDigitsOf, shareBasisPoints } from '@/lib/api/money-json';
import { useCurrencies, useDecimalPlaces, useLedgerBalances, type LedgerBalanceLine } from '@/lib/query/currencies';
import { postingCountKey, recentRecordKey, statusCountsKey } from '@/lib/query/keys';
import {
  ACTIVITY_WINDOWS,
  fetchPostingCount,
  fetchStatusCounts,
  lookupRecord,
  openedMonths,
  postingWeeks,
  type AccountDto,
  type AccountGroupDto,
  type ActivityWindow,
  type LedgerRecordLookup,
  type PostingDto,
} from '@/lib/query/overview';
import { parseRecent, readRecentText, subscribeRecent, type RecentEntry, type RecentKind } from '@/lib/recent/store';
import { GroupTypeBars } from './GroupTypeBars';
import { HeadlineTiles } from './HeadlineTiles';
import { countOf, formatCount, heightOf, MissingScope, Panel, Ready } from './parts';
import { StatusRing } from './StatusRing';

/**
 * DRK-1745 §3 — the Overview screen as `Design/ui_kits/overview/` lays it out: the page header
 * with its activity window, then the page search, the headline tiles, the position by currency,
 * accounts by status, groups by type, postings per week, accounts opened per month, recently
 * viewed and what is not charted. Every figure is a count or total the service returned (R1); a
 * region the operator has no permission for says so in place, and one region's failed read never
 * blanks another (R3). The window moves only the tiles' activity lines (R2).
 */
export interface OverviewScreenProps {
  grantedScopes: string[];
  /** The signed-in operator's directory object id — keys their recently viewed list (§3a). */
  directoryObjectId: string;
}

/** The ledger's currency count is unknown until it answers; the stand-in and a fresh ledger carry 3. */
const POSITION_PLACEHOLDER_ROWS = 3;

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

/** e.g. `22 Sep 2026 09:20`, or `22 Sep 09:20` without the year — always UTC. */
function utcStamp(at: Date, withYear: boolean): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(at.getUTCDate())} ${MONTH.format(at)}${withYear ? ` ${at.getUTCFullYear()}` : ''} ${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())}`;
}

/** Holds the as-at time's width, unseen, until the balances answer — so the header never reflows. */
const AS_AT_PLACEHOLDER = '00 Sep 0000 00:00';

/** When the operator last opened the record; nothing for a stored time that does not read as one. */
function seenAt(openedAt: string | undefined): string {
  const seen = new Date(openedAt ?? '');
  return Number.isNaN(seen.getTime()) ? '' : utcStamp(seen, false);
}

function HeaderAction({ href, scope, granted, primary = false, icon: Icon, children }: { href: string; scope: string; granted: boolean; primary?: boolean; icon: LucideIcon; children: string }): JSX.Element {
  const variant = primary ? 'primary' : 'default';
  if (!granted) {
    return (
      <ScopeGate scope={scope}>
        <Button variant={variant}>
          <Icon size={14} aria-hidden="true" />
          {children}
        </Button>
      </ScopeGate>
    );
  }
  return (
    <Button asChild variant={variant}>
      <a href={href}>
        <Icon size={14} aria-hidden="true" />
        {children}
      </a>
    </Button>
  );
}

export function OverviewScreen({ grantedScopes, directoryObjectId }: OverviewScreenProps): JSX.Element {
  const canReadAccounts = grantedScopes.includes('accounts.read');
  const canReadPostings = grantedScopes.includes('postings.read');
  // One clock reading per visit, so the week and month windows never shift mid-screen.
  const [now] = useState(() => new Date());
  const [activity, setActivity] = useState<ActivityWindow>('30');
  // The same read the position draws — its answer time is the balances' true "as at".
  const balances = useLedgerBalances(canReadAccounts);
  const asAt = balances.isSuccess ? utcStamp(new Date(balances.dataUpdatedAt), true) : null;

  return (
    <>
      <PageHeader
        icon="layout-dashboard"
        title="Overview"
        meta={
          <>
            <Caption>Activity window</Caption>
            <Tabs aria-label="Activity window" items={ACTIVITY_WINDOWS} value={activity} onChange={(value) => setActivity(value as ActivityWindow)} />
          </>
        }
        description={
          <>
            {"Find an account, then read the ledger's position. Balances are as at "}
            <span className={asAt ? 'tabular-nums' : 'invisible tabular-nums'}>{asAt ?? AS_AT_PLACEHOLDER}</span>
            {' UTC and are not scoped by the window.'}
          </>
        }
        actions={
          <>
            <HeaderAction href="/accounts?open=new" scope="accounts.write" granted={grantedScopes.includes('accounts.write')} icon={Wallet}>
              Open account
            </HeaderAction>
            <HeaderAction href="/records?open=new" scope="postings.write" granted={grantedScopes.includes('postings.write')} icon={Plus} primary>
              Record posting
            </HeaderAction>
          </>
        }
      />
      <Card>
        <Label>Find an account, group or posting</Label>
        <TopBarSearch grantedScopes={grantedScopes} variant="page" />
      </Card>
      <HeadlineTiles canReadAccounts={canReadAccounts} canReadPostings={canReadPostings} activity={activity} now={now} />
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start gap-5">
        <PositionPanel granted={canReadAccounts} balances={balances} />
        <div className="flex flex-col gap-5">
          <StatusRing granted={canReadAccounts} />
          <GroupTypeBars granted={canReadAccounts} />
        </div>
      </div>
      <div className="grid grid-cols-2 items-start gap-5">
        <PostingsPerWeekPanel granted={canReadPostings} now={now} />
        <AccountsOpenedPanel granted={canReadAccounts} now={now} />
      </div>
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start gap-5">
        <RecentlyViewedPanel grantedScopes={grantedScopes} directoryObjectId={directoryObjectId} />
        <NotCharted />
      </div>
    </>
  );
}

function Swatch({ colour, children }: { colour: string; children: ReactNode }): JSX.Element {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span aria-hidden="true" className="size-2 flex-none rounded-sm" style={{ background: colour }} />
      <Caption className="whitespace-nowrap">{children}</Caption>
    </span>
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

function PositionPanel({ granted, balances }: { granted: boolean; balances: UseQueryResult<LedgerBalanceLine[]> }): JSX.Element {
  const currencies = useCurrencies();
  const decimalPlacesOf = useDecimalPlaces();
  const failed = [balances, currencies].find((result) => result.isError);
  const loading = balances.isPending || currencies.isPending;

  return (
    <Panel title="Position by currency" sub="One row per currency carrying a balance, ledger-wide." right={<Caption><Mono>GET /v1/accounts/balances</Mono></Caption>}>
      {!granted ? (
        <MissingScope scope="accounts.read" />
      ) : failed ? (
        <FailedRead error={failed.error} onRetry={() => [balances, currencies].forEach((result) => void result.refetch())} />
      ) : (
        <Table className="table-fixed" {...loadingTableProps(loading)}>
          <colgroup>
            <col className="w-37.5" />
            <col />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
            <col className="w-[18%]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Currency</TableHead>
              <TableHead>
                <span className="flex flex-wrap gap-3">
                  <Swatch colour="var(--chart-1)">Available</Swatch>
                  <Swatch colour="var(--chart-4)">Held</Swatch>
                </span>
              </TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Held</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TablePlaceholderRows columns={5} count={POSITION_PLACEHOLDER_ROWS} />
            ) : (
              (() => {
                // Drawn at the currency's own scale; a currency the list does not know keeps the service's digits.
                const money = (line: LedgerBalanceLine, amount: string): JSX.Element => (
                  <Money amount={amount} decimalPlaces={decimalPlacesOf(line.currency) ?? fractionDigitsOf(amount)} />
                );
                return balances.data!.map((line) => (
                  <TableRow key={line.currency}>
                    <TableCell className="font-semibold">{line.currency}</TableCell>
                    <TableCell>
                      <PositionBar line={line} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{money(line, line.available)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{money(line, line.held)}</TableCell>
                    <TableCell className="text-right">{money(line, line.balance)}</TableCell>
                  </TableRow>
                ));
              })()
            )}
          </TableBody>
        </Table>
      )}
      <Note className="border-t border-border pt-3">
        Balances are reported per currency and are never combined into a single total. Each bar splits its own row between available and held, so the split is comparable within a currency and not between them.
      </Note>
    </Panel>
  );
}

function ChartPlaceholder({ bars }: { bars: number }): JSX.Element {
  return (
    <div className="grid h-40 items-end gap-1" style={{ gridTemplateColumns: `repeat(${bars}, minmax(0, 1fr))` }}>
      {Array.from({ length: bars }, (_, index) => (
        <Skeleton key={index} className="h-full" />
      ))}
    </div>
  );
}

function PostingsPerWeekPanel({ granted, now }: { granted: boolean; now: Date }): JSX.Element {
  const weeks = postingWeeks(now);
  const counts = useQueries({
    queries: weeks.map((week) => ({ queryKey: postingCountKey(week), queryFn: () => fetchPostingCount(week), enabled: granted })),
  });

  return (
    <Panel title="Postings per week" sub={`13 weeks of 7 days in UTC, ${weeks[0].from} to ${weeks[weeks.length - 1].to}.`}>
      {granted ? (
        <Ready results={counts} placeholder={<ChartPlaceholder bars={weeks.length} />}>
          {() => {
            const max = Math.max(...counts.map((result) => result.data!));
            return (
              <ol className="m-0 grid h-40 list-none grid-cols-13 gap-1 p-0">
                {weeks.map((week, index) => {
                  const count = counts[index].data!;
                  return (
                    <li key={week.from} className="flex min-w-0 flex-col items-center justify-end gap-1">
                      <Caption className="tabular-nums">{formatCount(count)}</Caption>
                      <div className="flex w-full flex-1 items-end border-b border-border">
                        <div role="img" aria-label={`${week.from} to ${week.to}: ${formatCount(count)} postings`} className="w-full rounded-t-sm bg-chart-1" style={{ height: heightOf(count, max) }} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            );
          }}
        </Ready>
      ) : (
        <MissingScope scope="postings.read" />
      )}
      <Note>Each week is the service&apos;s own count of postings that took effect in it, read as a page of one — never a count of listed rows. Bars are scaled to the busiest week.</Note>
    </Panel>
  );
}

const ACCOUNT_STATUSES = [
  { status: 'Active', colour: 'var(--chart-1)' },
  { status: 'Frozen', colour: 'var(--chart-2)' },
  { status: 'Dormant', colour: 'var(--chart-5)' },
  { status: 'Closed', colour: 'var(--chart-4)' },
];

function AccountsOpenedPanel({ granted, now }: { granted: boolean; now: Date }): JSX.Element {
  const months = openedMonths(now);
  const counts = useQueries({
    queries: months.map((month) => {
      const opened = { from: month.from, to: month.to };
      return { queryKey: statusCountsKey('accounts', opened), queryFn: () => fetchStatusCounts('accounts', opened), enabled: granted };
    }),
  });
  const shown = (value: number | undefined): string => (value === undefined ? '—' : formatCount(value));

  return (
    <Panel
      title="Accounts opened per month"
      sub={
        <span className="flex flex-wrap gap-3">
          {ACCOUNT_STATUSES.map(({ status, colour }) => (
            <Swatch key={status} colour={colour}>
              {status}
            </Swatch>
          ))}
        </span>
      }
    >
      {granted ? (
        <Ready results={counts} placeholder={<ChartPlaceholder bars={months.length} />}>
          {() => {
            // Each segment is scaled to a quarter of the largest single count, so a bar's height
            // follows the month's total without the browser adding the service's counts up.
            const max = Math.max(...counts.flatMap((result) => result.data!.map((line) => line.count)));
            return (
              <ol className="m-0 grid h-40 list-none grid-cols-12 gap-1 p-0">
                {months.map((month, index) => {
                  const monthCounts = counts[index].data!;
                  return (
                    <li key={month.from} className="flex min-w-0 flex-col items-center justify-end gap-1">
                      <div className="flex w-full flex-1 flex-col justify-end border-b border-border">
                        <div
                          role="img"
                          aria-label={`${month.label}: ${ACCOUNT_STATUSES.map(({ status }) => `${shown(countOf(monthCounts, status))} ${status.toLowerCase()}`).join(', ')}`}
                          className="flex h-full w-full flex-col-reverse overflow-hidden rounded-t-sm"
                        >
                          {ACCOUNT_STATUSES.map(({ status, colour }) => (
                            <div key={status} className="w-full flex-none" style={{ background: colour, height: heightOf(countOf(monthCounts, status) ?? 0, max * ACCOUNT_STATUSES.length) }} />
                          ))}
                        </div>
                      </div>
                      <Caption className="truncate">{month.label.slice(0, 3)}</Caption>
                    </li>
                  );
                })}
              </ol>
            );
          }}
        </Ready>
      ) : (
        <MissingScope scope="accounts.read" />
      )}
      <Note>
        Each month is the service&apos;s own count per status of the accounts opened in it (UTC), {months[0].label} to {months[months.length - 1].label}. A status is its account&apos;s status now.
      </Note>
    </Panel>
  );
}

const RECENT_KINDS: Record<RecentKind, { noun: string; scope: string; path: (id: string) => string }> = {
  Account: { noun: 'account', scope: 'accounts.read', path: (id) => `/api/ledger/accounts/${id}` },
  AccountGroup: { noun: 'group', scope: 'accounts.read', path: (id) => `/api/ledger/account-groups/${id}` },
  Posting: { noun: 'posting', scope: 'postings.read', path: (id) => `/api/ledger/postings/${id}` },
};

function RecentlyViewedPanel({ grantedScopes, directoryObjectId }: { grantedScopes: string[]; directoryObjectId: string }): JSX.Element {
  const headingId = useId();
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
    <Card role="region" aria-labelledby={headingId} padded={false}>
      <CardBar position="top">
        <Label id={headingId} role="heading" aria-level={2}>
          Recently viewed
        </Label>
        <Caption className="ml-auto">Last 10 · held in this browser</Caption>
      </CardBar>
      {entries === null ? null : entries.length === 0 ? (
        <p className="m-0 px-(--cell-padding-x) py-(--cell-padding-y) text-muted-foreground">Records you open will appear here.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {entries.map((entry, index) => (
            <li
              key={`${entry.kind}:${entry.id}`}
              className="flex flex-wrap items-center gap-4 border-t border-border px-(--cell-padding-x) py-(--cell-padding-y) text-[length:var(--text-table-size)] first:border-t-0"
            >
              <RecentEntryLine entry={entry} lookup={lookups[index]} granted={grantedScopes.includes(RECENT_KINDS[entry.kind].scope)} />
              <Caption className="ml-auto text-right">{seenAt(entry.openedAt)}</Caption>
              <ArrowRight size={14} aria-hidden="true" className="text-muted-foreground" />
            </li>
          ))}
        </ul>
      )}
    </Card>
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
        <span className="min-w-0 truncate">{account.name}</span>
        <Caption>
          <Mono>{account.currency}</Mono>
        </Caption>
      </>
    );
  }
  if (entry.kind === 'AccountGroup') {
    const group = record as AccountGroupDto;
    return (
      <>
        <a className="font-mono font-semibold text-link hover:underline" href={`/groups?open=${entry.id}`}>
          {group.code}
        </a>
        <span className="min-w-0 truncate">{group.name}</span>
      </>
    );
  }
  return (
    <>
      <a className="font-mono font-semibold text-link hover:underline" href={`/records?open=${entry.id}`}>
        {(record as PostingDto).postingNumber}
      </a>
      <span className="text-muted-foreground">Posting</span>
    </>
  );
}

function NotCharted(): JSX.Element {
  return (
    <Card role="note" aria-label="Not charted">
      <div>
        <Label>Not charted, and why</Label>
        <div className="mt-1.5 text-[length:var(--text-table-size)]">One figure an operations dashboard usually carries cannot be drawn against this service.</div>
      </div>
      <div className="text-[length:var(--text-table-size)]">
        <div className="font-semibold">One headline total</div>
        <Note>Balances are held per currency. A single figure across currencies would need an exchange-rate source this service does not have, so currencies are never added together.</Note>
      </div>
    </Card>
  );
}
