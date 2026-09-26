import type { CSSProperties, JSX } from 'react';
import { cn } from '@/components/ui/utils';
import { Money } from '@/components/ledger/Money';

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

function Tile({ label, amount, currency, decimalPlaces }: { label: string; amount: number | string; currency: string; decimalPlaces?: number }): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-label text-muted-foreground">{label}</span>
      <Money amount={amount} currency={currency} decimalPlaces={decimalPlaces} size="tile" align="left" />
    </div>
  );
}

export function BalanceTiles({ account, layout = 'tiles', style }: BalanceTilesProps): JSX.Element {
  return (
    <div className={cn('flex gap-6', layout === 'tiles' ? 'flex-wrap' : 'flex-row items-baseline')} style={style}>
      <Tile label="Balance" amount={account.balance} currency={account.currency} decimalPlaces={account.decimalPlaces} />
      <Tile label="Available" amount={account.availableBalance} currency={account.currency} decimalPlaces={account.decimalPlaces} />
      <Tile label="Held" amount={account.heldAmount} currency={account.currency} decimalPlaces={account.decimalPlaces} />
    </div>
  );
}
