import type { CSSProperties, JSX } from 'react';
import { formatAmount, isNegativeAmount } from '@/components/ledger/Money';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/components/ui/utils';

export interface FloorPolicy {
  permittedToGoNegative: boolean;
  overdraftLimit?: number | string | null;
  minimumBalance?: number | string | null;
  currency: string;
  decimalPlaces?: number;
}

export interface FloorLineProps {
  account: FloorPolicy;
  decimalPlaces?: number;
  style?: CSSProperties;
  className?: string;
  /**
   * DRK-1684 §3 row 11c — the service's own `AccountBalanceDto.Floor`, exact text. DRK-1760 §3
   * row 11 — the only floor ever drawn: absent while the balance read has not answered, the line
   * is a placeholder, never a figure worked out here.
   */
  floor?: string;
  /** The balance read failed: the floor is stated as unavailable. */
  failed?: boolean;
}

export function FloorLine({ account, decimalPlaces = 2, style, className, floor, failed = false }: FloorLineProps): JSX.Element {
  // The service's own text, kept exact end to end — never routed through `Number`, which
  // loses digits past `Number.MAX_SAFE_INTEGER` (a real money figure).
  if (floor === undefined) {
    return failed ? (
      <p style={style} className={className}>
        Floor unavailable — the balance could not be read.
      </p>
    ) : (
      <Skeleton style={style} className={cn('w-64', className)} />
    );
  }

  const negative = isNegativeAmount(floor);
  const formatted = formatAmount(floor, decimalPlaces);
  const sign = negative ? '−' : '';
  const detail = account.permittedToGoNegative
    ? `permitted to go negative, overdraft limit ${formatAmount(account.overdraftLimit ?? 0, decimalPlaces)}`
    : 'not permitted to go negative';

  return (
    <p style={style} className={className}>{`Floor ${sign}${formatted} ${account.currency} — ${detail}.`}</p>
  );
}
