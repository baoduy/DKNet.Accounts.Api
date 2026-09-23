import type { CSSProperties, JSX } from 'react';

export interface AccountBalanceShape {
  balance: number | string;
  availableBalance: number | string;
  heldAmount: number | string;
  currency: string;
  decimalPlaces?: number;
}

export interface BalanceTilesProps {
  account: AccountBalanceShape;
  /** `tiles` on the account screen; `inline` in the strip pinned above a statement. */
  layout?: 'tiles' | 'inline';
  style?: CSSProperties;
}

export function BalanceTiles(_props: BalanceTilesProps): JSX.Element {
  throw new Error('Not implemented: BalanceTiles');
}
