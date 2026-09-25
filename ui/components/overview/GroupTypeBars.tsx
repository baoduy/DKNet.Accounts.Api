'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Mono, Note } from '@/components/ui/text';
import { listTotalKey, statusCountsKey } from '@/lib/query/keys';
import { fetchListTotal, fetchStatusCounts } from '@/lib/query/overview';
import { countOf, formatCount, MissingScope, Panel, Ready } from './parts';

/**
 * DRK-1745 §3 row 6 — one bar per group type the service knows, each the service's
 * `totalItemCount` for `filter=Type:Equal:<type>`; bars are scaled to the largest type.
 */
const GROUP_TYPES = ['Customer', 'Merchant', 'Internal', 'Suspense', 'Settlement'];

function typeFilter(type: string): Record<string, string> {
  return { filter: `Type:Equal:${type}` };
}

function statusLine(counts: Array<{ status: string; count: number }>, status: string): string {
  const count = countOf(counts, status);
  return `${count === undefined ? '—' : formatCount(count)} ${status.toLowerCase()}`;
}

export function GroupTypeBars({ granted }: { granted: boolean }): JSX.Element {
  const statusCounts = useQuery({ queryKey: statusCountsKey('account-groups'), queryFn: () => fetchStatusCounts('account-groups'), enabled: granted });
  const typeCounts = useQueries({
    queries: GROUP_TYPES.map((type) => ({
      queryKey: listTotalKey('account-groups', typeFilter(type)),
      queryFn: () => fetchListTotal('account-groups', typeFilter(type)),
      enabled: granted,
    })),
  });

  return (
    <Panel
      title="Account groups by type"
      sub={!granted ? null : statusCounts.data ? `${statusLine(statusCounts.data, 'Active')} · ${statusLine(statusCounts.data, 'Closed')}` : <Skeleton className="h-(--text-table-leading) w-32" />}
    >
      {granted ? (
        <Ready
          results={typeCounts}
          placeholder={
            <div className="flex flex-col gap-2">
              {GROUP_TYPES.map((type) => (
                <Skeleton key={type} className="h-(--text-table-leading)" />
              ))}
            </div>
          }
        >
          {() => {
            const max = Math.max(...typeCounts.map((result) => result.data!));
            return (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {GROUP_TYPES.map((type, index) => {
                  const count = typeCounts[index].data!;
                  return (
                    <li key={type} className="grid grid-cols-[--spacing(24)_minmax(0,1fr)_--spacing(9)] items-center gap-3 text-[length:var(--text-table-size)] leading-(--text-table-leading)">
                      <span>{type}</span>
                      <span role="img" aria-label={`${type}: ${formatCount(count)} groups`} className="block h-2 overflow-hidden rounded-sm bg-muted">
                        <span className="block h-full bg-chart-2" style={{ width: `${max === 0 ? 0 : (count / max) * 100}%` }} />
                      </span>
                      <span className="text-right font-semibold tabular-nums">{formatCount(count)}</span>
                    </li>
                  );
                })}
              </ul>
            );
          }}
        </Ready>
      ) : (
        <MissingScope scope="accounts.read" />
      )}
      <Note>
        Bars are scaled to the largest type. Each bar is the service&apos;s count for its type:{' '}
        <Mono className="text-[length:var(--text-caption-size)]">filter=Type:Equal:Customer</Mono>.
      </Note>
    </Panel>
  );
}
