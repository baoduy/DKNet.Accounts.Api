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
  /** DRK-1713 §3 row 2 — one of the 3 fields the service's posting search covers. */
  counterpartyReference?: string;
  /** Defaults to today on the fake's clock. */
  effectiveDate?: string;
  /** Defaults to the moment the fake is seeded. */
  recordedAt?: string;
  /** DRK-1713 §3a — set on a reversal, naming the original it reverses. */
  reversesPostingId?: string;
  /** DRK-1713 §3a — set on an original once reversed, naming the reversal. */
  reversedByPostingId?: string;
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

/**
 * Calls one of the fake ledger's routes; a refused request or an answer outside 2xx throws,
 * naming the stand-in, the route and the status (DRK-1726 §3 row 7) — a seed or reset that did
 * not land never lets the check go on against the wrong data.
 */
async function ledgerFetch(route: string, init: RequestInit = {}): Promise<Response> {
  const method = init.method ?? 'GET';
  let response: Response;
  try {
    response = await fetch(`${FAKE_LEDGER_BASE}${route}`, init);
  } catch (error) {
    throw new Error(`stand-in ledger did not answer ${method} ${route}: ${(error as Error).message}`);
  }
  if (!response.ok) throw new Error(`stand-in ledger answered ${method} ${route} with ${response.status}: ${await response.text()}`);
  return response;
}

/** Resets `fake-ledger-service.ts` to an empty dataset. */
export async function resetLedger(): Promise<void> {
  await ledgerFetch('/__reset', { method: 'POST' });
}

/** Seeds accounts into `fake-ledger-service.ts` (upsert by `accountNumber`). */
export async function seedLedgerAccounts(accounts: LedgerAccountFixture[]): Promise<void> {
  await ledgerFetch('/__seed', {
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
  await ledgerFetch('/__seed', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ accountGroups: groups.map((group) => ({ status: 'Active', ...group })) }),
  });
}

/** Seeds postings into `fake-ledger-service.ts`, appended to the existing stream. */
export async function seedLedgerPostings(postings: LedgerPostingFixture[]): Promise<void> {
  await ledgerFetch('/__seed', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ postings: postings.map((posting) => ({ status: 'Posted', ...posting })) }),
  });
}

/** DRK-1697 §3 row 15 — seeds account groups into `fake-ledger-service.ts` (upsert by `code`). */
export async function seedAccountGroups(groups: AccountGroupFixture[]): Promise<void> {
  await ledgerFetch('/__seed', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ accountGroups: groups }),
  });
}

/** DRK-1697 §3 row 15 — seeds currencies into `fake-ledger-service.ts` (upsert by `code`). */
export async function seedCurrencies(currencies: CurrencyFixture[]): Promise<void> {
  await ledgerFetch('/__seed', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ currencies }),
  });
}

/** Every request `fake-ledger-service.ts` has received since the last reset. */
export async function ledgerRequests(): Promise<Array<{ method: string; path: string }>> {
  const response = await ledgerFetch('/__requests');
  return (await response.json()) as Array<{ method: string; path: string }>;
}

/** DRK-1713 §3 row 2 — every posting the fake ledger holds, recorded or seeded. */
export async function ledgerPostings(): Promise<Array<{ id: string; postingNumber: string; accountId: string; direction: string; amount: string; currency: string; status: string; category: string; description: string | null; effectiveDate: string | null; reversesPostingId: string | null; reversedByPostingId: string | null }>> {
  const response = await ledgerFetch('/__postings');
  // Amounts arrive as raw numeric literals — kept as their exact text, never through `Number`.
  const text = (await response.text()).replace(/"(amount|signedAmount|balanceAfter)":(-?[0-9.]+)/g, '"$1":"$2"');
  return JSON.parse(text);
}

/** DRK-1713 "Controlled clock" — the day the fake writes a reversal (or an undated recording) on. */
export async function setLedgerClock(today: string | null): Promise<void> {
  await ledgerFetch('/__clock', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ today }) });
}

/** DRK-1713 — the next recording is written, but its answer never reaches the console. */
export async function dropNextPostingAnswer(): Promise<void> {
  await ledgerFetch('/__drop-next-answer', { method: 'POST' });
}

/** Every recording (`POST /v1/postings`) the fake has received since the last reset, with the
 * idempotency key it carried and its body as sent. */
export async function recordingRequests(): Promise<Array<{ idempotencyKey: string | undefined; body: Record<string, unknown> }>> {
  const response = await ledgerFetch('/__requests');
  const log = (await response.json()) as Array<{ method: string; path: string; headers: Record<string, string>; body?: Record<string, unknown> }>;
  return log
    .filter((entry) => entry.method === 'POST' && entry.path === '/v1/postings')
    .map((entry) => ({ idempotencyKey: entry.headers['idempotency-key'], body: entry.body ?? {} }));
}
