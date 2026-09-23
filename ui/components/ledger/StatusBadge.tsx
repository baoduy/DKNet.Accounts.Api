import type { CSSProperties, JSX } from 'react';

export type LedgerStatus = 'Active' | 'Dormant' | 'Frozen' | 'Closed' | 'Inactive' | 'Posted' | 'Reversed';

/** The single status → tone map for accounts, groups, postings and currencies. */
export const STATUS_TONE: Record<LedgerStatus, 'credit' | 'debit' | 'warning' | 'info' | 'neutral'> = {
  Active: 'credit',
  Dormant: 'warning',
  Frozen: 'debit',
  Closed: 'neutral',
  Inactive: 'neutral',
  Posted: 'credit',
  Reversed: 'warning',
};

export interface StatusBadgeProps {
  status: LedgerStatus | string;
  tone?: 'credit' | 'debit' | 'warning' | 'info' | 'neutral';
  style?: CSSProperties;
}

export function StatusBadge(_props: StatusBadgeProps): JSX.Element {
  throw new Error('Not implemented: StatusBadge');
}
