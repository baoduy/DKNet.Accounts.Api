import type { CSSProperties } from 'react';

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
export declare function computeFloor(policy: Pick<FloorPolicy, 'permittedToGoNegative' | 'overdraftLimit' | 'minimumBalance'>): number | null;

export interface FloorLineProps {
  account: FloorPolicy;
  decimalPlaces?: number;
  style?: CSSProperties;
}
export declare function FloorLine(props: FloorLineProps): JSX.Element;
