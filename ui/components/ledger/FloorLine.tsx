import type { CSSProperties, JSX } from 'react';

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
  _policy: Pick<FloorPolicy, 'permittedToGoNegative' | 'overdraftLimit' | 'minimumBalance'>,
): number | null {
  throw new Error('Not implemented: computeFloor');
}

export interface FloorLineProps {
  account: FloorPolicy;
  decimalPlaces?: number;
  style?: CSSProperties;
}

export function FloorLine(_props: FloorLineProps): JSX.Element {
  throw new Error('Not implemented: FloorLine');
}
