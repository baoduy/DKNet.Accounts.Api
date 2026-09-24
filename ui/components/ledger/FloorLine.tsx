import type { CSSProperties, JSX } from 'react';
import { formatAmount, isNegativeAmount } from '@/components/ledger/Money';

export interface FloorPolicy {
  permittedToGoNegative: boolean;
  overdraftLimit?: number | string | null;
  minimumBalance?: number | string | null;
  currency: string;
  decimalPlaces?: number;
}

/**
 * The computed floor, mirroring `AccountFloorPolicy.Floor` (`AccountFloorPolicy.cs:32-34`):
 *
 * | permittedToGoNegative | overdraftLimit | floor |
 * |---|---|---|
 * | false | — | `Math.max(0, minimumBalance ?? 0)` |
 * | true  | set | `Math.max(-overdraftLimit, minimumBalance ?? MinValue)` |
 * | true  | **null** | invalid — refused with OVERDRAFT_LIMIT_REQUIRED |
 */
export function computeFloor(
  policy: Pick<FloorPolicy, 'permittedToGoNegative' | 'overdraftLimit' | 'minimumBalance'>,
): number | null {
  if (policy.permittedToGoNegative) {
    if (policy.overdraftLimit === null || policy.overdraftLimit === undefined) return null;
    const minimum = policy.minimumBalance === null || policy.minimumBalance === undefined ? Number.MIN_SAFE_INTEGER : Number(policy.minimumBalance);
    return Math.max(-Number(policy.overdraftLimit), minimum);
  }
  const minimum = policy.minimumBalance === null || policy.minimumBalance === undefined ? 0 : Number(policy.minimumBalance);
  return Math.max(0, minimum);
}

export interface FloorLineProps {
  account: FloorPolicy;
  decimalPlaces?: number;
  style?: CSSProperties;
  /**
   * DRK-1684 §3 row 11c — the service's own `AccountBalanceDto.Floor`, exact text, no local
   * recomputation. Takes precedence over `computeFloor`, which is the fallback for callers
   * with no balance response.
   */
  floor?: string;
}

export function FloorLine({ account, decimalPlaces = 2, style, floor: floorProp }: FloorLineProps): JSX.Element {
  // The service's own text, kept exact end to end — never routed through `Number`, which
  // loses digits past `Number.MAX_SAFE_INTEGER` (a real money figure).
  const floor = floorProp ?? computeFloor(account);

  if (floor === null) {
    return <p style={style}>Floor OVERDRAFT_LIMIT_REQUIRED — permitted to go negative with no overdraft limit set.</p>;
  }

  const negative = isNegativeAmount(floor);
  const formatted = formatAmount(floor, decimalPlaces);
  const sign = negative ? '−' : '';
  const detail = account.permittedToGoNegative
    ? `permitted to go negative, overdraft limit ${formatAmount(account.overdraftLimit ?? 0, decimalPlaces)}`
    : 'not permitted to go negative';

  return (
    <p style={style}>{`Floor ${sign}${formatted} ${account.currency} — ${detail}.`}</p>
  );
}
