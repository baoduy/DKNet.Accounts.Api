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

/** Every request `fake-ledger-service.ts` has received since the last reset. */
export async function ledgerRequests(): Promise<Array<{ method: string; path: string }>> {
  const response = await fetch(`${FAKE_LEDGER_BASE}/__requests`);
  return (await response.json()) as Array<{ method: string; path: string }>;
}
