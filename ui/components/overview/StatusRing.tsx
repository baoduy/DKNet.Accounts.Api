'use client';

import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Caption, Mono, Note } from '@/components/ui/text';
import { listTotalKey, statusCountsKey } from '@/lib/query/keys';
import { fetchListTotal, fetchStatusCounts } from '@/lib/query/overview';
import { countOf, formatCount, MissingScope, Panel, Ready } from './parts';

/**
 * DRK-1745 §3 row 5 — accounts by status as a ring and a legend, from the service's own status
 * counts; the centre is the service's account total, never the counts added up (R1). Hand-drawn
 * SVG, as the kit draws it (`Design/ui_kits/overview/Overview.jsx` `StatusDonut`).
 */
const STATUSES = [
  { status: 'Active', colour: 'var(--credit)' },
  { status: 'Dormant', colour: 'var(--warning)' },
  { status: 'Frozen', colour: 'var(--debit)' },
  { status: 'Closed', colour: 'var(--muted-foreground)' },
];

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A status the service did not send is drawn as unknown, never as 0. */
function shown(count: number | undefined): string {
  return count === undefined ? '—' : formatCount(count);
}

function share(count: number | undefined, total: number): string {
  if (count === undefined) return '—';
  return `${total === 0 ? '0.0' : ((count / total) * 100).toFixed(1)}%`;
}

function Ring({ lines, total }: { lines: Array<{ status: string; colour: string; count: number | undefined }>; total: number }): JSX.Element {
  const lengths = lines.map((line) => (total === 0 || line.count === undefined ? 0 : (line.count / total) * CIRCUMFERENCE));
  // Each arc starts where the ones before it end on the circle.
  const starts = lengths.map((_, index) => lengths.slice(0, index).reduce((sum, length) => sum + length, 0));
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        role="img"
        aria-label={`Accounts by status: ${lines.map((line) => `${line.status} ${shown(line.count)} (${share(line.count, total)})`).join(', ')}`}
        className="relative size-33 flex-none"
      >
        <svg width="132" height="132" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="var(--muted)" strokeWidth={16} />
          <g transform="rotate(-90 60 60)">
            {lines.map((line, index) => (
              <circle
                  key={line.status}
                  cx="60"
                  cy="60"
                  r={RADIUS}
                  fill="none"
                  stroke={line.colour}
                  strokeWidth={16}
                  strokeDasharray={`${lengths[index]} ${CIRCUMFERENCE - lengths[index]}`}
                  strokeDashoffset={-starts[index]}
                />
            ))}
          </g>
        </svg>
        <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[length:var(--text-tile-amount-size)] font-bold tabular-nums">{formatCount(total)}</div>
          <Caption>accounts</Caption>
        </div>
      </div>
      <ul className="m-0 flex min-w-45 flex-1 basis-50 list-none flex-col p-0">
        {lines.map((line) => (
          <li key={line.status} className="grid grid-cols-[--spacing(4)_minmax(--spacing(14),1fr)_--spacing(11)_--spacing(12)] items-center gap-2 px-2 py-1.5 text-[length:var(--text-table-size)] leading-(--text-table-leading)">
            <span aria-hidden="true" className="size-2 rounded-sm" style={{ background: line.colour }} />
            <span className="truncate">{line.status}</span>
            <span className="text-right font-semibold tabular-nums">{shown(line.count)}</span>
            <Caption className="text-right tabular-nums">{share(line.count, total)}</Caption>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatusRing({ granted }: { granted: boolean }): JSX.Element {
  const counts = useQuery({ queryKey: statusCountsKey('accounts'), queryFn: () => fetchStatusCounts('accounts'), enabled: granted });
  const accountTotal = useQuery({ queryKey: listTotalKey('accounts'), queryFn: () => fetchListTotal('accounts'), enabled: granted });
  const groupTotal = useQuery({ queryKey: listTotalKey('account-groups'), queryFn: () => fetchListTotal('account-groups'), enabled: granted });

  return (
    <Panel
      title="Accounts by status"
      sub={
        !granted ? null : accountTotal.data !== undefined && groupTotal.data !== undefined ? (
          `${formatCount(accountTotal.data)} accounts across ${formatCount(groupTotal.data)} groups.`
        ) : (
          <Skeleton className="h-(--text-table-leading) w-48" />
        )
      }
    >
      {granted ? (
        <Ready
          results={[counts, accountTotal]}
          placeholder={
            <div className="flex flex-wrap items-center gap-4">
              <Skeleton className="size-33 flex-none rounded-full" />
              <Skeleton className="h-30 min-w-45 flex-1 basis-50" />
            </div>
          }
        >
          {() => <Ring lines={STATUSES.map((line) => ({ ...line, count: countOf(counts.data!, line.status) }))} total={accountTotal.data!} />}
        </Ready>
      ) : (
        <MissingScope scope="accounts.read" />
      )}
      <Note className="border-t border-border pt-3">
        Each figure is the service&apos;s own count per status (<Mono className="text-[length:var(--text-caption-size)]">GET /v1/accounts/status-counts</Mono>), never a count over a listing.
      </Note>
    </Panel>
  );
}
