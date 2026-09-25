'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useId, type JSX, type ReactNode } from 'react';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label, Mono, Note } from '@/components/ui/text';
import { listTotalKey, postingCountKey, statusCountsKey } from '@/lib/query/keys';
import {
  activityFromDate,
  activityPostingWindow,
  fetchListTotal,
  fetchPostingCount,
  fetchStatusCounts,
  LONGEST_POSTING_DAYS,
  type ActivityWindow,
  type StatusCount,
} from '@/lib/query/overview';
import { countOf, formatCount, Ready } from './parts';

/**
 * DRK-1745 §3 row 4 — the four headline tiles. Each total is the service's `totalItemCount`, each
 * status figure the service's unwindowed status count; only the activity lines read the window (R2).
 */
export interface HeadlineTilesProps {
  canReadAccounts: boolean;
  canReadPostings: boolean;
  activity: ActivityWindow;
  now: Date;
}

/** Every tile's activity line holds three caption lines, so the tiles keep one height loaded or not. */
const LINE_HEIGHT = 'min-h-[calc(var(--text-caption-leading)*3)]';

export const ATTENTION_FILTER = 'Status:In:Dormant,Frozen';

function Tile({ label, granted, results, value, line }: { label: string; granted: boolean; results: UseQueryResult[]; value: () => number; line: () => ReactNode }): JSX.Element {
  const labelId = useId();
  return (
    <Card role="region" aria-labelledby={labelId} className="gap-0">
      <Label id={labelId}>{label}</Label>
      {granted ? (
        <Ready
          results={results}
          placeholder={
            <>
              <Skeleton className="mt-1 h-(--text-tile-amount-leading) w-16" />
              <Skeleton className={`mt-0.5 w-40 ${LINE_HEIGHT}`} />
            </>
          }
        >
          {() => (
            <>
              <div className="mt-1 text-[length:var(--text-tile-amount-size)] leading-[var(--text-tile-amount-leading)] font-bold tabular-nums">{formatCount(value())}</div>
              <Note className={`mt-0.5 ${LINE_HEIGHT}`}>{line()}</Note>
            </>
          )}
        </Ready>
      ) : (
        <div className="mt-1">
          <ScopeGate scope="accounts.read" />
        </div>
      )}
    </Card>
  );
}

/** `in the last 7 days`, or the stated longest span when the window is `All time`. */
function postingSpan(activity: ActivityWindow): string {
  return activity === 'all' ? `in the last ${LONGEST_POSTING_DAYS} days, the longest span the posting list answers` : `in the last ${activity} days`;
}

export function HeadlineTiles({ canReadAccounts, canReadPostings, activity, now }: HeadlineTilesProps): JSX.Element {
  const accounts = { enabled: canReadAccounts };
  const accountTotal = useQuery({ queryKey: listTotalKey('accounts'), queryFn: () => fetchListTotal('accounts'), ...accounts });
  const groupTotal = useQuery({ queryKey: listTotalKey('account-groups'), queryFn: () => fetchListTotal('account-groups'), ...accounts });
  const currencyTotal = useQuery({ queryKey: listTotalKey('currencies'), queryFn: () => fetchListTotal('currencies'), ...accounts });
  const attentionTotal = useQuery({
    queryKey: listTotalKey('accounts', { filter: ATTENTION_FILTER }),
    queryFn: () => fetchListTotal('accounts', { filter: ATTENTION_FILTER }),
    ...accounts,
  });
  const accountCounts = useQuery({ queryKey: statusCountsKey('accounts'), queryFn: () => fetchStatusCounts('accounts'), ...accounts });
  const groupCounts = useQuery({ queryKey: statusCountsKey('account-groups'), queryFn: () => fetchStatusCounts('account-groups'), ...accounts });

  // The previous window's line stays drawn while the next one is read, so the tile never blanks (R2).
  const postingWindow = activityPostingWindow(now, activity);
  const windowPostings = useQuery({ queryKey: postingCountKey(postingWindow), queryFn: () => fetchPostingCount(postingWindow), enabled: canReadPostings, placeholderData: keepPreviousData });
  const fromDate = activityFromDate(now, activity);
  const windowGroups = useQuery({ queryKey: listTotalKey('account-groups', { fromDate }), queryFn: () => fetchListTotal('account-groups', { fromDate }), ...accounts, placeholderData: keepPreviousData });

  const status = (result: UseQueryResult<StatusCount[]>, name: string): string => {
    const count = countOf(result.data!, name);
    return count === undefined ? '—' : formatCount(count);
  };

  return (
    <div className="grid grid-cols-4 gap-5">
      <Tile
        label="Accounts"
        granted={canReadAccounts}
        results={canReadPostings ? [accountTotal, accountCounts, windowPostings] : [accountTotal, accountCounts]}
        value={() => accountTotal.data!}
        line={() => (
          <>
            {canReadPostings ? `${formatCount(windowPostings.data!)} postings ${postingSpan(activity)}` : <ScopeGate scope="postings.read" />}
            {` · ${status(accountCounts, 'Active')} active`}
          </>
        )}
      />
      <Tile
        label="Account groups"
        granted={canReadAccounts}
        results={[groupTotal, groupCounts, windowGroups]}
        value={() => groupTotal.data!}
        line={() => `${formatCount(windowGroups.data!)} with activity ${activity === 'all' ? 'at any time' : `in the last ${activity} days`} · ${status(groupCounts, 'Closed')} closed`}
      />
      <Tile label="Currencies" granted={canReadAccounts} results={[currencyTotal]} value={() => currencyTotal.data!} line={() => 'Registered in the ledger; balances are held per currency'} />
      <Tile
        label="Needs attention"
        granted={canReadAccounts}
        results={[attentionTotal, accountCounts]}
        value={() => attentionTotal.data!}
        line={() => (
          <>
            {`${status(accountCounts, 'Dormant')} dormant · ${status(accountCounts, 'Frozen')} frozen — `}
            <Mono className="text-[length:var(--text-caption-size)] break-all">{`filter=${ATTENTION_FILTER}`}</Mono>
          </>
        )}
      />
    </div>
  );
}
