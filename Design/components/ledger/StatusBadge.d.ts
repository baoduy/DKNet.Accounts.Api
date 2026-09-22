import type { CSSProperties } from 'react';

export type LedgerStatus =
  | 'Active' | 'Dormant' | 'Frozen' | 'Closed' | 'Inactive' | 'Posted' | 'Reversed';

/** The single status → tone map for accounts, groups, postings and currencies. */
export declare const STATUS_TONE: Record<LedgerStatus, 'credit' | 'debit' | 'warning' | 'info' | 'neutral'>;

/**
 * Account, group, posting and currency statuses. Severity is carried by hue:
 * amber (Dormant) blocks half of what you can do, rose (Frozen) blocks all of it.
 */
export interface StatusBadgeProps {
  status: LedgerStatus | string;
  /** Escape hatch for a status not in the map. Prefer extending `STATUS_TONE`. */
  tone?: 'credit' | 'debit' | 'warning' | 'info' | 'neutral';
  style?: CSSProperties;
}
export declare function StatusBadge(props: StatusBadgeProps): JSX.Element;
