import type { CSSProperties, JSX } from 'react';
import { formatAmount } from '@/components/ledger/Money';

export interface FloorPolicy {
  permittedToGoNegative: boolean;
  overdraftLimit?: number | string | null;
  minimumBalance?: number | string | null;
  currency: string;
  decimalPlaces?: number;
}

/**
 * The computed floor, mirroring `AccountFloorPolicy`:
 *
 * | permittedToGoNegative | overdraftLimit | minimumBalance | floor |
 * |---|---|---|---|
 * | false | — | null | 0.00 |
 * | false | — | set  | the minimum balance |
 * | true  | set | —   | −overdraftLimit |
 * | true  | **null** | — | invalid — refused with OVERDRAFT_LIMIT_REQUIRED |
 */
export function computeFloor(
  policy: Pick<FloorPolicy, 'permittedToGoNegative' | 'overdraftLimit' | 'minimumBalance'>,
): number | null {
  if (policy.permittedToGoNegative) {
    if (policy.overdraftLimit === null || policy.overdraftLimit === undefined) return null;
    return -Number(policy.overdraftLimit);
  }
  if (policy.minimumBalance === null || policy.minimumBalance === undefined) return 0;
  return Number(policy.minimumBalance);
}

export interface FloorLineProps {
  account: FloorPolicy;
  decimalPlaces?: number;
  style?: CSSProperties;
  /**
   * DRK-1684 §3 row 11c — the service's own `AccountBalanceDto.Floor`, exact text, no local
   * recomputation. Not yet honoured by `FloorLine` below (Mode: acceptance-tests) — Build
   * makes this the render source when set, falling back to `computeFloor` only when a caller
   * has no balance response.
   */
  floor?: string;
}

export function FloorLine({ account, decimalPlaces = 2, style }: FloorLineProps): JSX.Element {
  const floor = computeFloor(account);

  if (floor === null) {
    return <p style={style}>Floor OVERDRAFT_LIMIT_REQUIRED — permitted to go negative with no overdraft limit set.</p>;
  }

  const negative = floor < 0;
  const formatted = formatAmount(String(floor), decimalPlaces);
  const sign = negative ? '−' : '';
  const detail = account.permittedToGoNegative
    ? `permitted to go negative, overdraft limit ${formatAmount(account.overdraftLimit ?? 0, decimalPlaces)}`
    : 'not permitted to go negative';

  return (
    <p style={style}>{`Floor ${sign}${formatted} ${account.currency} — ${detail}.`}</p>
  );
}
