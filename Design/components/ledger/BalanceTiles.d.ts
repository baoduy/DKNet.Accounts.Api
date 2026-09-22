import type { CSSProperties } from 'react';

export interface AccountBalanceShape {
  balance: number | string;
  availableBalance: number | string;
  heldAmount: number | string;
  currency: string;
  decimalPlaces?: number;
}

/**
 * Renders `balance`, `availableBalance` and `heldAmount` as three values, never one.
 * Balance and Available are equal today — `AvailableBalance => Balance` on the entity,
 * with held funds deferred — and are still shown separately, because the day holds are
 * implemented the two diverge and a UI showing one number would be wrong that day with
 * no code change to blame.
 */
export interface BalanceTilesProps {
  account: AccountBalanceShape;
  /** `tiles` on the account screen; `inline` in the strip pinned above a statement. */
  layout?: 'tiles' | 'inline';
  style?: CSSProperties;
}
export declare function BalanceTiles(props: BalanceTilesProps): JSX.Element;
