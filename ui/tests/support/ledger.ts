import { FAKE_LEDGER_BASE } from './fixtures';

export interface LedgerAccountFixture {
  accountNumber: string;
  currency: string;
  decimalPlaces: number;
  balance: string;
  availableBalance: string;
  heldAmount: string;
  permittedToGoNegative: boolean;
  overdraftLimit?: string | null;
  minimumBalance?: string | null;
  /** DRK-1697 — the account group (by id) this account belongs to, if any. */
  groupId?: string;
}

export type AccountGroupType = 'Customer' | 'Merchant' | 'Internal' | 'Suspense' | 'Settlement';
export type AccountGroupStatus = 'Active' | 'Closed';

export interface AccountGroupFixture {
  id?: string;
  code: string;
  name: string;
  description?: string;
  type?: AccountGroupType;
  status?: AccountGroupStatus;
  ownerId: string;
  metadata?: Record<string, string>;
}

export interface CurrencyFixture {
  id?: string;
  code: string;
  name?: string;
  decimalPlaces: number;
  isActive?: boolean;
}

/** Resets `fake-ledger-service.ts` to an empty dataset. */
export async function resetLedger(): Promise<void> {
  await fetch(`${FAKE_LEDGER_BASE}/__reset`, { method: 'POST' });
}

/** Seeds accounts into `fake-ledger-service.ts` (upsert by `accountNumber`). */
export async function seedLedgerAccounts(accounts: LedgerAccountFixture[]): Promise<void> {
  await fetch(`${FAKE_LEDGER_BASE}/__seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ accounts }),
  });
}

/** DRK-1697 §3 row 15 — seeds account groups into `fake-ledger-service.ts` (upsert by `code`). */
export async function seedAccountGroups(groups: AccountGroupFixture[]): Promise<void> {
  await fetch(`${FAKE_LEDGER_BASE}/__seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ accountGroups: groups }),
  });
}

/** DRK-1697 §3 row 15 — seeds currencies into `fake-ledger-service.ts` (upsert by `code`). */
export async function seedCurrencies(currencies: CurrencyFixture[]): Promise<void> {
  await fetch(`${FAKE_LEDGER_BASE}/__seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ currencies }),
  });
}

/** Every request `fake-ledger-service.ts` has received since the last reset. */
export async function ledgerRequests(): Promise<Array<{ method: string; path: string }>> {
  const response = await fetch(`${FAKE_LEDGER_BASE}/__requests`);
  return (await response.json()) as Array<{ method: string; path: string }>;
}
