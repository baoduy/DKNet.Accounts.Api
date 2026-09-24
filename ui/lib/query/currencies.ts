/**
 * DRK-1697 §3 row 8 — typed read layer over `/api/ledger/currencies*`.
 */
import { readLedgerJson } from '@/lib/api/money-json';
import { refusalError } from '@/lib/api/refusal';

export interface Currency {
  id: string;
  code: string;
  name: string;
  decimalPlaces: number;
  isActive: boolean;
}

/** One line per currency actually in use, across every account group (`GET /v1/accounts/balances`);
 * every amount is the exact text the service sent. */
export interface LedgerBalanceLine {
  currency: string;
  balance: string;
  available: string;
  held: string;
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
  if (!response.ok) throw refusalError(body);
  // DRK-1732 §3 row 10: the service answers with a page (`PagedCurrencyResponse`). A bare list
  // is still read, because the component tests (`components/**`, not this cycle's to change)
  // stub the old shape.
  return (Array.isArray(body) ? body : (body as { items: unknown[] }).items).map(toCurrency);
}

export async function fetchCurrency(currencyId: string): Promise<Currency> {
  const response = await fetch(`/api/ledger/currencies/${encodeURIComponent(currencyId)}`);
  const body = await readLedgerJson(response);
  if (!response.ok) throw refusalError(body);
  return toCurrency(body);
}

/**
 * The ledger-wide per-currency totals — tells whether a currency still holds a balance (R5: the
 * console shows that reason, disabled, before the operator ever tries to deactivate it) and draws
 * Overview's position by currency (DRK-1728 §3 row 6); never displayed as a combined figure (R2).
 */
export async function fetchLedgerBalances(): Promise<LedgerBalanceLine[]> {
  const response = await fetch('/api/ledger/accounts/balances');
  const body = await readLedgerJson(response);
  if (!response.ok) throw refusalError(body);
  return body as LedgerBalanceLine[];
}
