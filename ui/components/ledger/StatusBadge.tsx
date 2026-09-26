import type { CSSProperties, JSX } from 'react';
import { badgeVariants } from '@/components/ui/badge';
import { cn } from '@/components/ui/utils';

export type LedgerStatus = 'Active' | 'Dormant' | 'Frozen' | 'Closed' | 'Inactive' | 'Posted' | 'Reversed';

/** The single status → tone map for accounts, groups, postings and currencies. */
export const STATUS_TONE: Record<LedgerStatus, 'credit' | 'debit' | 'warning' | 'info' | 'neutral'> = {
  Active: 'credit',
  Dormant: 'warning',
  Frozen: 'debit',
  Closed: 'neutral',
  Inactive: 'neutral',
  Posted: 'info',
  Reversed: 'neutral',
};

const TONE_CLASSES: Record<'credit' | 'debit' | 'warning' | 'info' | 'neutral', string> = {
  credit: 'bg-badge-credit-bg text-badge-credit-fg',
  debit: 'bg-badge-debit-bg text-badge-debit-fg',
  warning: 'bg-badge-warning-bg text-badge-warning-fg',
  info: 'bg-badge-info-bg text-badge-info-fg',
  neutral: 'bg-badge-neutral-bg text-badge-neutral-fg',
};

export interface StatusBadgeProps {
  status: LedgerStatus | string;
  tone?: 'credit' | 'debit' | 'warning' | 'info' | 'neutral';
  style?: CSSProperties;
}

export function StatusBadge({ status, tone, style }: StatusBadgeProps): JSX.Element {
  const resolvedTone = tone ?? STATUS_TONE[status as LedgerStatus] ?? 'neutral';

  return (
    <span className={cn(badgeVariants({ className: TONE_CLASSES[resolvedTone] }))} style={style}>
      {status}
    </span>
  );
}
