import type { CSSProperties, JSX } from 'react';
import { Money } from '@/components/ledger/Money';
import { Currency } from '@/components/ledger/Currency';

export interface CurrencyBalance {
  currency: string;
  amount: number | string;
  decimalPlaces?: number;
}

export interface CurrencyBalanceListProps {
  balances: CurrencyBalance[];
  /** Shown when the group holds no accounts. */
  emptyMessage?: string;
  style?: CSSProperties;
}

export function CurrencyBalanceList({ balances, emptyMessage = 'No balances.', style }: CurrencyBalanceListProps): JSX.Element {
  if (balances.length === 0) {
    return <p style={style}>{emptyMessage}</p>;
  }

  return (
    <div style={style}>
      <ul className="flex flex-col gap-2">
        {balances.map((balance) => (
          <li key={balance.currency} className="flex items-center justify-between gap-4">
            <Currency code={balance.currency} />
            <Money amount={balance.amount} decimalPlaces={balance.decimalPlaces} align="right" />
          </li>
        ))}
      </ul>
      <p className="text-caption text-muted-foreground">
        These balances are not combined into a total — each currency is its own line.
      </p>
    </div>
  );
}
