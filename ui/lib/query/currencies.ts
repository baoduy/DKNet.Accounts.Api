/**
 * DRK-1697 §3 row 8 — typed read layer over `/api/ledger/currencies*`.
 */
import { isOkStatus, readLedgerJson } from '@/lib/api/money-json';
import { refusalError } from '@/lib/api/refusal';

export interface Currency {
  id: string;
  code: string;
  name: string;
  decimalPlaces: number;
  isActive: boolean;
}

/** One line per currency actually in use, across every account group (`GET /v1/accounts/balances`). */
export interface LedgerBalanceLine {
  currency: string;
  balance: string;
}

/**
 * `decimalPlaces` is a small C# `int`, not a monetary amount — `readLedgerJson` turned it into
 * a digit string along with every other number in the body (row 7 draws no field-by-field
 * distinction), so it is safe, and necessary, to route this one back through `Number` here.
 */
export function toCurrency(raw: unknown): Currency {
  const body = raw as { id: string; code: string; name: string; decimalPlaces: string; isActive: boolean };
  return { id: body.id, code: body.code, name: body.name, decimalPlaces: Number(body.decimalPlaces), isActive: body.isActive };
}

export async function fetchCurrencies(): Promise<Currency[]> {
  const response = await fetch('/api/ledger/currencies');
  const body = await readLedgerJson(response);
  if (!isOkStatus(response.status)) throw refusalError(body);
  return (body as unknown[]).map(toCurrency);
}

export async function fetchCurrency(currencyId: string): Promise<Currency> {
  const response = await fetch(`/api/ledger/currencies/${encodeURIComponent(currencyId)}`);
  const body = await readLedgerJson(response);
  if (!isOkStatus(response.status)) throw refusalError(body);
  return toCurrency(body);
}

/**
 * The ledger-wide per-currency totals — used only to tell whether a currency still holds a
 * balance (R5: the console shows that reason, disabled, before the operator ever tries to
 * deactivate it), never displayed as a combined figure (R2).
 */
export async function fetchLedgerBalances(): Promise<LedgerBalanceLine[]> {
  const response = await fetch('/api/ledger/accounts/balances');
  const body = await readLedgerJson(response);
  if (!isOkStatus(response.status)) throw refusalError(body);
  return body as LedgerBalanceLine[];
}
