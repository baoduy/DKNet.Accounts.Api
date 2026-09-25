import type { UseQueryResult } from '@tanstack/react-query';
import { useId, type JSX, type ReactNode } from 'react';
import { FailedRead } from '@/components/feedback/RefusalAlert';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/text';
import type { StatusCount } from '@/lib/query/overview';

/** DRK-1745 — the pieces every Overview region shares: its card, its scope gate and its read states. */

/** A bar's length as a share of the chart's largest single figure — counts only, never money. */
export function heightOf(count: number, max: number): string {
  return `${max === 0 ? 0 : (count / max) * 100}%`;
}

export function formatCount(count: number): string {
  return count.toLocaleString('en-US');
}

/** The service's count for `status` — it spells statuses upper-case (§3a). */
export function countOf(counts: StatusCount[], status: string): number | undefined {
  return counts.find((line) => line.status.toUpperCase() === status.toUpperCase())?.count;
}

/** A kit card head (`Design/ui_kits/overview/Overview.jsx` `CardHead`) naming the region it opens. */
export function Panel({ title, sub, right, className, children }: { title: string; sub?: ReactNode; right?: ReactNode; className?: string; children: ReactNode }): JSX.Element {
  const headingId = useId();
  return (
    <Card role="region" aria-labelledby={headingId} className={className}>
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <Label id={headingId} role="heading" aria-level={2}>
            {title}
          </Label>
          {sub ? <div className="mt-1.5 text-[length:var(--text-table-size)] leading-(--text-table-leading)">{sub}</div> : null}
        </div>
        {right ? <div className="ml-auto flex-none">{right}</div> : null}
      </div>
      {children}
    </Card>
  );
}

export function MissingScope({ scope }: { scope: string }): JSX.Element {
  return (
    <p className="m-0 flex flex-wrap items-center gap-2">
      <span>This panel needs a permission you do not hold.</span>
      <ScopeGate scope={scope} />
    </p>
  );
}

/**
 * `children` once every read has answered — so it may take each read's data as present. Until then
 * `placeholder` stands in at the final size (DRK-1725 R1); a refused read is stated in its place
 * with a way to try again, in this region only (R3).
 */
export function Ready({ results, placeholder, children }: { results: UseQueryResult[]; placeholder: ReactNode; children: () => ReactNode }): JSX.Element {
  const failed = results.filter((result) => result.isError);
  if (failed.length > 0) {
    return <FailedRead error={failed[0].error} onRetry={() => failed.forEach((result) => void result.refetch())} />;
  }
  return <>{results.some((result) => result.isPending) ? placeholder : children()}</>;
}
