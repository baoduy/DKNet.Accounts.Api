/**
 * DRK-1697 §3 row 8 — typed read layer over `/api/ledger/currencies*`. Build stage implements
 * the bodies; this stub only pins the shape `CurrenciesScreen` (row 12) compiles against.
 */

export interface Currency {
  id: string;
  code: string;
  name: string;
  decimalPlaces: number;
  isActive: boolean;
}

export async function fetchCurrencies(): Promise<Currency[]> {
  throw new Error('Not implemented — DRK-1697 Build stage (row 8).');
}

export async function fetchCurrency(_currencyId: string): Promise<Currency> {
  throw new Error('Not implemented — DRK-1697 Build stage (row 8).');
}
