import { FAKE_LEDGER_BASE } from './fixtures';

export interface LedgerAccountFixture {
  id?: string;
  accountNumber: string;
  groupId?: string;
  name?: string;
  classification?: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
  status?: 'Active' | 'Frozen' | 'Dormant' | 'Closed';
  currency: string;
  decimalPlaces: number;
  balance: string;
  availableBalance: string;
  heldAmount: string;
  permittedToGoNegative: boolean;
  overdraftLimit?: string | null;
  minimumBalance?: string | null;
  externalReference?: string;
  metadata?: Record<string, string>;
  openedOn?: string;
  closedOn?: string | null;
  streamPosition?: number;
}

export interface LedgerAccountGroupFixture {
  id: string;
  code: string;
  name: string;
  type: string;
  status?: 'Active' | 'Closed';
  ownerId?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface LedgerPostingFixture {
  id: string;
  postingNumber: string;
  accountId: string;
  streamPosition: number;
  direction: 'Debit' | 'Credit';
  amount: string;
  signedAmount: string;
  balanceAfter: string;
  currency: string;
  status?: 'Posted' | 'Reversed';
  category: string;
  description?: string;
  effectiveDate?: string;
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
    body: JSON.stringify({
      accounts: accounts.map((account) => ({
        id: account.id ?? account.accountNumber,
        accountNumber: account.accountNumber,
        groupId: account.groupId ?? 'group-default',
        name: account.name ?? account.accountNumber,
        classification: account.classification ?? 'Asset',
        status: account.status ?? 'Active',
        currency: account.currency,
        decimalPlaces: account.decimalPlaces,
        balance: account.balance,
        availableBalance: account.availableBalance,
        heldAmount: account.heldAmount,
        permittedToGoNegative: account.permittedToGoNegative,
        overdraftLimit: account.overdraftLimit ?? null,
        minimumBalance: account.minimumBalance ?? null,
        externalReference: account.externalReference,
        metadata: account.metadata,
        openedOn: account.openedOn ?? new Date(0).toISOString(),
        closedOn: account.closedOn ?? null,
        streamPosition: account.streamPosition ?? 0,
      })),
    }),
  });
}

/** Seeds account groups into `fake-ledger-service.ts` (upsert by `id`). */
export async function seedLedgerAccountGroups(groups: LedgerAccountGroupFixture[]): Promise<void> {
  await fetch(`${FAKE_LEDGER_BASE}/__seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ accountGroups: groups.map((group) => ({ status: 'Active', ...group })) }),
  });
}

/** Seeds postings into `fake-ledger-service.ts`, appended to the existing stream. */
export async function seedLedgerPostings(postings: LedgerPostingFixture[]): Promise<void> {
  await fetch(`${FAKE_LEDGER_BASE}/__seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ postings: postings.map((posting) => ({ status: 'Posted', ...posting })) }),
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
