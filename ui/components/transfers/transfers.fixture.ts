/**
 * DRK-2325 §5 Background — the ledger the Transfers screen's @unit scenarios run against, shared by
 * `TransfersScreen.*.test.tsx`: the 6 accounts and their currencies, a transfer builder, and a
 * `fetch` stand-in for the console's pass-through (`/api/ledger/...`) that answers the way the
 * service does — every amount an unquoted JSON number carrying its exact text, every enum value
 * camelCase — and records what the screen asked for.
 *
 * Expected values in the tests are the spec's own literals; nothing here calls production code.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { vi } from 'vitest';
import { TransfersScreen } from './TransfersScreen';

/** The page address the mocked `useSearchParams` reads — set it to reopen a copied link. */
export const address = { search: '' };

export const ALL_SCOPES = ['accounts.read', 'postings.read', 'postings.write'];

export const ID = {
  alice: 'a0000000-0000-4000-8000-000000000101',
  bobSgd: 'a0000000-0000-4000-8000-000000000102',
  feesSgd: 'a0000000-0000-4000-8000-000000000103',
  doraSgd: 'a0000000-0000-4000-8000-000000000105',
  bobUsd: 'a0000000-0000-4000-8000-000000000201',
  keiJpy: 'a0000000-0000-4000-8000-000000000301',
  goldXau: 'a0000000-0000-4000-8000-000000000401',
};

/** The select option each account is listed as: "number — name". */
export const OPTION = {
  alice: 'ACME-000101 — Alice SGD',
  bobSgd: 'ACME-000102 — Bob SGD',
  feesSgd: 'ACME-000103 — Fees SGD',
  doraSgd: 'ACME-000105 — Dora SGD',
  bobUsd: 'ACME-000201 — Bob USD',
  keiJpy: 'ACME-000301 — Kei JPY',
  goldXau: 'ACME-000401 — Gold XAU',
};

/** An amount the service writes as an unquoted JSON number, digit for digit. */
class WireNumber {
  constructor(readonly text: string) {}
  toJSON(): string {
    return `@@number:${this.text}@@`;
  }
}

export function num(text: string): WireNumber {
  return new WireNumber(text);
}

/** JSON text as the service writes it: `num(...)` leaves are spliced in unquoted. */
export function wire(body: unknown): string {
  return JSON.stringify(body).replace(/"@@number:(-?[0-9.]+)@@"/g, '$1');
}

type Status = 'active' | 'frozen' | 'closed' | 'dormant';

function account(id: string, accountNumber: string, name: string, currency: string, status: Status = 'active'): Record<string, unknown> {
  return {
    id,
    accountNumber,
    groupId: 'g0000000-0000-4000-8000-000000000001',
    name,
    currency,
    classification: 'asset',
    status,
    balance: num('1000.00'),
    availableBalance: num('1000.00'),
    heldAmount: num('0.00'),
    permittedToGoNegative: false,
    streamPosition: 1,
    openedOn: '2026-01-02',
  };
}

/** The Background's ledger; `doraStatus` sets "Dora SGD"'s status, `withGold` adds "Gold XAU". */
export function ledgerAccounts({ doraStatus = 'active', withGold = false }: { doraStatus?: Status; withGold?: boolean } = {}): Record<string, unknown>[] {
  return [
    account(ID.alice, 'ACME-000101', 'Alice SGD', 'SGD'),
    account(ID.bobSgd, 'ACME-000102', 'Bob SGD', 'SGD'),
    account(ID.feesSgd, 'ACME-000103', 'Fees SGD', 'SGD'),
    account(ID.doraSgd, 'ACME-000105', 'Dora SGD', 'SGD', doraStatus),
    account(ID.bobUsd, 'ACME-000201', 'Bob USD', 'USD'),
    account(ID.keiJpy, 'ACME-000301', 'Kei JPY', 'JPY'),
    ...(withGold ? [account(ID.goldXau, 'ACME-000401', 'Gold XAU', 'XAU')] : []),
  ];
}

const CURRENCIES = [
  { id: 'c1', code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, isActive: true },
  { id: 'c2', code: 'USD', name: 'US Dollar', decimalPlaces: 2, isActive: true },
  { id: 'c3', code: 'JPY', name: 'Japanese Yen', decimalPlaces: 0, isActive: true },
  { id: 'c4', code: 'XAU', name: 'Gold', decimalPlaces: 6, isActive: true },
];

export interface TransferFields {
  id?: string;
  source?: string;
  destination?: string;
  amount?: string;
  sourceCurrency?: string;
  destinationCurrency?: string;
  rate?: string | null;
  fee?: string;
  feeAccount?: string | null;
  converted?: string;
  recordedAt?: string;
  callingSystem?: string;
  idempotencyKey?: string;
}

/** One transfer row as `GET /v1/accounts/{id}/transfers` writes it. Defaults: the spec's
 * 100.00 SGD from "Alice SGD" to "Bob USD" at 0.74 with a 2.00 SGD fee to "Fees SGD". */
export function transferRow(fields: TransferFields = {}): Record<string, unknown> {
  const rate = fields.rate === undefined ? '0.74' : fields.rate;
  const feeAccount = fields.feeAccount === undefined ? ID.feesSgd : fields.feeAccount;
  return {
    id: fields.id ?? 'c0000000-0000-4000-8000-000000000001',
    sourceAccountId: fields.source ?? ID.alice,
    destinationAccountId: fields.destination ?? ID.bobUsd,
    amount: num(fields.amount ?? '100.00'),
    sourceCurrency: fields.sourceCurrency ?? 'SGD',
    destinationCurrency: fields.destinationCurrency ?? 'USD',
    exchangeRate: rate === null ? null : num(rate),
    fee: num(fields.fee ?? '2.00'),
    feeAccountId: feeAccount,
    convertedAmount: num(fields.converted ?? '72.52'),
    recordedAt: fields.recordedAt ?? '2026-10-19T09:30:00+00:00',
    callingSystem: fields.callingSystem ?? 'PayHub',
    idempotencyKey: fields.idempotencyKey ?? 'payroll-oct-001',
  };
}

export interface PostingFields {
  postingNumber: string;
  account: string;
  direction: 'debit' | 'credit';
  category: 'transfer' | 'fee';
  amount: string;
  currency: string;
}

export function posting(fields: PostingFields, index: number): Record<string, unknown> {
  return {
    id: `b0000000-0000-4000-8000-00000000010${index}`,
    postingNumber: fields.postingNumber,
    accountId: fields.account,
    streamPosition: index + 1,
    direction: fields.direction,
    amount: num(fields.amount),
    signedAmount: num(fields.direction === 'debit' ? `-${fields.amount}` : fields.amount),
    currency: fields.currency,
    status: 'posted',
    category: fields.category,
    effectiveDate: '2026-10-19',
  };
}

export interface Answer {
  status: number;
  ok: boolean;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
}

export function answer(body: unknown, status = 200): Answer {
  return { status, ok: status >= 200 && status < 300, text: async () => wire(body), json: async () => JSON.parse(wire(body)) };
}

export function paged(items: unknown[], { pageNumber = 1, pageSize = 10, pageCount = 1 }: { pageNumber?: number; pageSize?: number; pageCount?: number } = {}): unknown {
  return { items, pageNumber, pageSize, pageCount, totalItemCount: pageCount > 1 ? pageCount * pageSize : items.length, hasNextPage: pageNumber < pageCount, hasPreviousPage: pageNumber > 1 };
}

/** A refusal in the service's shape: `{ status, errors: [{ message, code?, field? }], traceId }`. */
export function refused(status: number, error: { message: string; code?: string; field?: string }): Answer {
  return answer({ status, errors: [error], traceId: 'trace-1' }, status);
}

export interface LedgerCall {
  method: string;
  url: string;
  headers: Headers;
  body?: string;
}

export interface LedgerStubOptions {
  accounts?: Record<string, unknown>[];
  /** The list `GET /accounts/{id}/transfers` answers for `accountId` with these query params. */
  transfers?: (accountId: string, params: URLSearchParams) => Answer;
  /** `GET /transfers/{id}`. */
  transfer?: (id: string) => Answer;
  /** `POST /transfers` — called once per send, in order. */
  record?: () => Promise<Answer>;
  /** `GET /accounts?...` refused instead of answered. */
  accountsRefusal?: Answer;
}

export interface LedgerStub {
  calls: LedgerCall[];
  /** The query of every `GET /accounts/{accountId}/transfers` the screen made, in order. */
  listReads: (accountId?: string) => URLSearchParams[];
  /** Every `GET /accounts?...` the screen made. */
  accountListReads: () => URLSearchParams[];
  /** Every `POST /transfers` the screen sent. */
  sends: () => LedgerCall[];
}

const TRANSFER_LIST = /^\/api\/ledger\/accounts\/([^/?]+)\/transfers(?:\?(.*))?$/;
const ACCOUNT_ONE = /^\/api\/ledger\/accounts\/([^/?]+)$/;
const TRANSFER_ONE = /^\/api\/ledger\/transfers\/([^/?]+)$/;

/** Stubs the browser's `fetch` with the Background's ledger. */
export function stubLedger(options: LedgerStubOptions = {}): LedgerStub {
  const accounts = options.accounts ?? ledgerAccounts();
  const calls: LedgerCall[] = [];
  const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit): Promise<Answer> => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    calls.push({ method, url, headers: new Headers(init?.headers), body: typeof init?.body === 'string' ? init.body : undefined });

    if (method === 'POST' && url === '/api/ledger/transfers') {
      return options.record ? options.record() : answer(transferRow(), 201);
    }
    if (method !== 'GET') return answer({ status: 404, errors: [{ message: `unexpected ${method} ${url}` }] }, 404);

    if (url.startsWith('/api/ledger/currencies')) return answer(CURRENCIES);
    if (url.startsWith('/api/ledger/accounts?')) {
      if (options.accountsRefusal) return options.accountsRefusal;
      return answer(paged(accounts, { pageSize: 1000 }));
    }
    const list = TRANSFER_LIST.exec(url);
    if (list) {
      const params = new URLSearchParams(list[2] ?? '');
      return options.transfers ? options.transfers(list[1], params) : answer(paged([]));
    }
    const one = ACCOUNT_ONE.exec(url);
    if (one) {
      const found = accounts.find((candidate) => candidate.id === one[1] || candidate.accountNumber === one[1]);
      return found ? answer(found) : answer({ status: 404, errors: [{ message: 'Account not found.' }] }, 404);
    }
    const transfer = TRANSFER_ONE.exec(url);
    if (transfer && options.transfer) return options.transfer(transfer[1]);
    return answer({ status: 404, errors: [{ message: `unexpected GET ${url}` }] }, 404);
  });
  vi.stubGlobal('fetch', fetchMock);

  return {
    calls,
    listReads: (accountId) =>
      calls
        .filter((call) => call.method === 'GET')
        .map((call) => TRANSFER_LIST.exec(call.url))
        .filter((match): match is RegExpExecArray => match !== null && (accountId === undefined || match[1] === accountId))
        .map((match) => new URLSearchParams(match[2] ?? '')),
    accountListReads: () => calls.filter((call) => call.method === 'GET' && call.url.startsWith('/api/ledger/accounts?')).map((call) => new URLSearchParams(call.url.split('?')[1])),
    sends: () => calls.filter((call) => call.method === 'POST' && call.url === '/api/ledger/transfers'),
  };
}

/** Each idempotency key the console mints, in order: `k-1`, `k-2`, ... */
export function mintKeysInOrder(): void {
  let minted = 0;
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
    minted += 1;
    return `k-${minted}` as `${string}-${string}-${string}-${string}-${string}`;
  });
}

/** "Today is 2026-10-19 in UTC" (or `now`) — only `Date` is faked, so the screen's timers still run. */
export function setNow(now = '2026-10-19T10:00:00Z'): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(now));
}

export function renderScreen(grantedScopes: string[] = ALL_SCOPES): RenderResult {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(createElement(QueryClientProvider, { client: queryClient }, createElement(TransfersScreen, { grantedScopes })));
}

export function resetScreen(): void {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
  address.search = '';
}

export function accountSelect(): HTMLSelectElement {
  return screen.getByRole('combobox', { name: 'Account' });
}

/** Chooses `option` in the screen's account select once the accounts have arrived. */
export async function chooseAccount(option: string): Promise<void> {
  await screen.findByRole('option', { name: option });
  await userEvent.selectOptions(accountSelect(), option);
}

/** The text of each cell of the table row drawn for the transfer recorded at `recordedAt`. */
export async function rowCells(recordedAt: string): Promise<string[]> {
  const cell = await screen.findByRole('cell', { name: recordedAt });
  return [...cell.closest('tr')!.querySelectorAll('td')].map((td) => (td.textContent ?? '').replace(/\s+/g, ' ').trim());
}

export function panel(): HTMLElement {
  return screen.getByRole('complementary', { name: 'Details' });
}

/** Lets the screen act on what just happened (a render, an effect, a read it would start). */
export async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 50));
}

export function confirmDialog(): HTMLElement {
  return screen.getByRole('dialog');
}

export function inPanel(): ReturnType<typeof within> {
  return within(panel());
}
