/**
 * DRK-2325 §3 row 3 — the confirm step's estimated destination amount, worked out with the
 * service's own rule (`TransferConversion.cs`): (amount − fee) × rate, rounded half away from zero
 * to the destination currency's places. Exact: every step runs on `toScaledUnits`' BigInt units,
 * never through `Number` (R5 — the only amount the browser works out).
 */
import { fractionDigitsOf, toScaledUnits } from '@/lib/api/money-json';

/** An unsigned decimal as an operator types it: digits, then optionally a point and more digits. */
const DECIMAL = /^\d+(\.\d+)?$/;

/** `units` (a count of `10^-scale`) as decimal text with exactly `places` fraction digits. */
function toDecimalText(units: bigint, places: number): string {
  const digits = (units < 0n ? -units : units).toString().padStart(places + 1, '0');
  const sign = units < 0n ? '-' : '';
  return places === 0 ? `${sign}${digits}` : `${sign}${digits.slice(0, -places)}.${digits.slice(-places)}`;
}

/**
 * The estimate as decimal text at `places` (`72.52`, `1136`), or `null` when the amount, the fee or
 * the rate is not a number. A `null` rate is a same-currency transfer: the estimate is amount − fee.
 */
export function estimateConverted(amount: string, fee: string, rate: string | null, places: number): string | null {
  const factor = rate ?? '1';
  if (![amount, fee, factor].every((value) => DECIMAL.test(value))) return null;

  const scale = Math.max(fractionDigitsOf(amount), fractionDigitsOf(fee));
  const rateScale = fractionDigitsOf(factor);
  const product = (toScaledUnits(amount, scale) - toScaledUnits(fee, scale)) * toScaledUnits(factor, rateScale);
  const productScale = scale + rateScale;
  if (productScale <= places) return toDecimalText(product * 10n ** BigInt(places - productScale), places);

  const divisor = 10n ** BigInt(productScale - places);
  const magnitude = product < 0n ? -product : product;
  // Half away from zero: a remainder of half the divisor or more rounds the magnitude up.
  const rounded = magnitude / divisor + ((magnitude % divisor) * 2n >= divisor ? 1n : 0n);
  return toDecimalText(product < 0n ? -rounded : rounded, places);
}
