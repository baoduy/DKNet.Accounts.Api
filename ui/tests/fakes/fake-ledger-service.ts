/**
 * A minimal, in-memory stand-in for the ledger service (`DKNet.Accounts.Api`'s own HTTP
 * surface), mirroring `fake-oidc-issuer.ts`'s shape. The pass-through endpoint (DRK-1684
 * §3 row 5) is the only production caller; this fake is also driven directly by tests that
 * need to seed state or assert what was (or was not) called.
 *
 * Response shapes follow `README.md`'s "Refusals and error codes" table verbatim:
 * `{ status, errors: [{ message, code?, field? }], traceId }`.
 *
 * Endpoints:
 *   GET    /v1/accounts/:accountNumber/balance
 *   GET    /v1/accounts/balances
 *   GET    /v1/accounts/:accountNumber/statement
 *   GET    /v1/postings                 (?search=, ?accountId=)
 *   POST   /v1/postings                 (header: Idempotency-Key)
 *   POST   /v1/postings/:id/reverse
 *   GET    /v1/currencies
 *   POST   /v1/currencies                                  (DRK-1697 §3a)
 *   GET    /v1/currencies/:id
 *   PUT    /v1/currencies/:id
 *   POST   /v1/currencies/:id/activate
 *   POST   /v1/currencies/:id/deactivate
 *   GET    /v1/account-groups            (?filter=, ?search=, ?orderBy=, ?desc=, ?pageNumber=, ?pageSize=)
 *   POST   /v1/account-groups
 *   GET    /v1/account-groups/:id
 *   PUT    /v1/account-groups/:id
 *   DELETE /v1/account-groups/:id
 *   POST   /v1/account-groups/:id/close
 *   POST   /v1/account-groups/:id/activate
 *   GET    /v1/account-groups/:id/balances
 *
 * Test control (never part of the generated contract):
 *   POST   /__seed    — replaces the in-memory dataset
 *   POST   /__reset   — clears the dataset and the request log
 *   GET    /__requests — every request this instance has received since the last reset
 */
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.FAKE_LEDGER_PORT ?? 4499);

interface AccountFixture {
  accountNumber: string;
  currency: string;
  decimalPlaces: number;
  balance: string;
  availableBalance: string;
  heldAmount: string;
  permittedToGoNegative: boolean;
  overdraftLimit?: string | null;
  minimumBalance?: string | null;
  /** DRK-1697 — links this account to a group's balances/holds-balance checks. */
  groupId?: string;
}

interface CurrencyFixture {
  id: string;
  code: string;
  name: string;
  decimalPlaces: number;
  isActive: boolean;
}

type AccountGroupType = 'Customer' | 'Merchant' | 'Internal' | 'Suspense' | 'Settlement';
type AccountGroupStatus = 'Active' | 'Closed';

interface AccountGroupFixture {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: AccountGroupType;
  status: AccountGroupStatus;
  ownerId: string;
  metadata?: Record<string, string>;
}

interface PostingRecord {
  id: string;
  postingNumber: string;
  accountId: string;
  streamPosition: number;
  direction: 'Debit' | 'Credit';
  amount: string;
  signedAmount: string;
  currency: string;
  status: string;
  category: string;
  description?: string;
  effectiveDate?: string;
}

interface ErrorItem {
  message: string;
  code?: string;
  field?: string;
}

interface RequestLogEntry {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
}

function defaultCurrencies(): CurrencyFixture[] {
  return [
    { id: randomUUID(), code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, isActive: true },
    { id: randomUUID(), code: 'JPY', name: 'Japanese Yen', decimalPlaces: 0, isActive: true },
    { id: randomUUID(), code: 'BHD', name: 'Bahraini Dinar', decimalPlaces: 3, isActive: true },
  ];
}

let accounts = new Map<string, AccountFixture>();
let currencies: CurrencyFixture[] = defaultCurrencies();
let accountGroups = new Map<string, AccountGroupFixture>();
let postings: PostingRecord[] = [];
let postingCounter = 0;
const idempotencyResponses = new Map<string, { bodyHash: string; status: number; body: unknown }>();
let requestLog: RequestLogEntry[] = [];

function reset(): void {
  accounts = new Map();
  currencies = defaultCurrencies();
  accountGroups = new Map();
  postings = [];
  postingCounter = 0;
  idempotencyResponses.clear();
  requestLog = [];
}

/** Mirrors `AccountFloorPolicy.Floor` (`AccountFloorPolicy.cs:32-34`). */
function computeFloor(account: AccountFixture): number {
  if (account.permittedToGoNegative) {
    const overdraft = Number(account.overdraftLimit ?? Number.NaN);
    const minimum = account.minimumBalance !== undefined && account.minimumBalance !== null ? Number(account.minimumBalance) : Number.MIN_SAFE_INTEGER;
    return Math.max(-overdraft, minimum);
  }
  const minimum = account.minimumBalance !== undefined && account.minimumBalance !== null ? Number(account.minimumBalance) : 0;
  return Math.max(0, minimum);
}

function refusal(status: number, errors: ErrorItem[]): Response {
  return Response.json({ status, errors, traceId: randomUUID() }, { status });
}

function accountBalanceDto(account: AccountFixture): unknown {
  return {
    currency: account.currency,
    balance: account.balance,
    availableBalance: account.availableBalance,
    heldAmount: account.heldAmount,
    floor: String(computeFloor(account)),
  };
}

function currencyDto(currency: CurrencyFixture): unknown {
  return { id: currency.id, code: currency.code, name: currency.name, decimalPlaces: currency.decimalPlaces, isActive: currency.isActive };
}

function accountGroupDto(group: AccountGroupFixture): unknown {
  return {
    id: group.id,
    code: group.code,
    name: group.name,
    description: group.description,
    type: group.type,
    status: group.status,
    ownerId: group.ownerId,
    metadata: group.metadata,
  };
}

function groupAccounts(groupId: string): AccountFixture[] {
  return [...accounts.values()].filter((account) => account.groupId === groupId);
}

/** `Field:Operation:Value` triples — only `Equal` is needed by any scenario this fake serves. */
function parseFilters(url: URL): Array<{ field: string; op: string; value: string }> {
  return url.searchParams.getAll('filter').map((raw) => {
    const [field, op, ...rest] = raw.split(':');
    return { field: field ?? '', op: op ?? 'Equal', value: rest.join(':') };
  });
}

function fieldValue(record: Record<string, unknown>, field: string): unknown {
  const key = field.charAt(0).toLowerCase() + field.slice(1);
  return record[key];
}

function matchesFilters(record: Record<string, unknown>, filters: Array<{ field: string; op: string; value: string }>): boolean {
  return filters.every((filter) => {
    const value = fieldValue(record, filter.field);
    if (filter.op === 'Equal') return String(value ?? '') === filter.value;
    if (filter.op === 'NotEqual') return String(value ?? '') !== filter.value;
    if (filter.op === 'Contains') return String(value ?? '').toLowerCase().includes(filter.value.toLowerCase());
    return true;
  });
}

function sortRecords<T extends Record<string, unknown>>(records: T[], orderBy: string | null, desc: boolean): T[] {
  if (!orderBy) return records;
  const key = orderBy.charAt(0).toLowerCase() + orderBy.slice(1);
  const sorted = [...records].sort((a, b) => {
    const x = String(a[key] ?? '');
    const y = String(b[key] ?? '');
    return x.localeCompare(y);
  });
  return desc ? sorted.reverse() : sorted;
}

/**
 * Exact decimal-string addition via `BigInt`, scaled to the widest operand's decimal places —
 * never routes an amount through a JS `number` (R1), so a sum past 2^53 keeps every digit.
 */
function addDecimalStrings(values: string[]): string {
  if (values.length === 0) return '0';
  const decimalsOf = (v: string): number => (v.includes('.') ? v.split('.')[1].length : 0);
  const maxDecimals = Math.max(...values.map(decimalsOf));
  const scale = 10n ** BigInt(maxDecimals);
  const toScaled = (v: string): bigint => {
    const negative = v.startsWith('-');
    const abs = negative ? v.slice(1) : v;
    const [intPart, fracPart = ''] = abs.split('.');
    const scaled = BigInt(intPart || '0') * scale + BigInt(fracPart.padEnd(maxDecimals, '0') || '0');
    return negative ? -scaled : scaled;
  };
  const total = values.reduce((sum, v) => sum + toScaled(v), 0n);
  const negative = total < 0n;
  const digits = (negative ? -total : total).toString().padStart(maxDecimals + 1, '0');
  const intPart = digits.slice(0, digits.length - maxDecimals) || '0';
  const fracPart = maxDecimals > 0 ? `.${digits.slice(digits.length - maxDecimals)}` : '';
  return `${negative ? '-' : ''}${intPart}${fracPart}`;
}

/**
 * One `{ currency, balance, available, held }` line, `balance`/`available`/`held` written as
 * raw (unquoted) JSON number literals holding the operand's exact decimal text — building the
 * response as a JS object and calling `Response.json()` would round each through a 64-bit
 * float first, which is exactly the digit-loss row 7 exists to guard against.
 */
function balanceLineJson(currency: string, balance: string, available: string, held: string): string {
  return `{"currency":${JSON.stringify(currency)},"balance":${balance},"available":${available},"held":${held}}`;
}

function pageOf<T>(records: T[], pageNumber: number, pageSize: number): { items: T[]; pageIndex: number; pageSize: number; pageCount: number; hasNextPage: boolean } {
  const clampedPageNumber = Math.max(1, pageNumber);
  const clampedPageSize = Math.min(1000, Math.max(1, pageSize));
  const pageCount = Math.max(1, Math.ceil(records.length / clampedPageSize));
  const pageIndex = Math.min(clampedPageNumber, pageCount) - 1;
  const items = records.slice(pageIndex * clampedPageSize, (pageIndex + 1) * clampedPageSize);
  return { items, pageIndex, pageSize: clampedPageSize, pageCount, hasNextPage: pageIndex + 1 < pageCount };
}

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);

  if (segments[0] === '__reset' && request.method === 'POST') {
    reset();
    return Response.json({ ok: true });
  }

  if (segments[0] === '__requests' && request.method === 'GET') {
    return Response.json(requestLog);
  }

  if (segments[0] === '__seed' && request.method === 'POST') {
    const seed = (await request.json()) as {
      accounts?: AccountFixture[];
      currencies?: Array<{ id?: string; code: string; name?: string; decimalPlaces: number; isActive?: boolean }>;
      accountGroups?: Array<{
        id?: string;
        code: string;
        name: string;
        description?: string;
        type?: AccountGroupType;
        status?: AccountGroupStatus;
        ownerId: string;
        metadata?: Record<string, string>;
      }>;
    };
    for (const account of seed.accounts ?? []) {
      accounts.set(account.accountNumber, account);
    }
    for (const currency of seed.currencies ?? []) {
      const existing = currencies.find((c) => c.code === currency.code);
      const merged: CurrencyFixture = {
        id: existing?.id ?? currency.id ?? randomUUID(),
        code: currency.code,
        name: currency.name ?? existing?.name ?? currency.code,
        decimalPlaces: currency.decimalPlaces,
        isActive: currency.isActive ?? existing?.isActive ?? true,
      };
      if (existing) {
        currencies = currencies.map((c) => (c.code === currency.code ? merged : c));
      } else {
        currencies.push(merged);
      }
    }
    for (const group of seed.accountGroups ?? []) {
      const existing = [...accountGroups.values()].find((g) => g.code === group.code);
      const merged: AccountGroupFixture = {
        id: existing?.id ?? group.id ?? randomUUID(),
        code: group.code,
        name: group.name,
        description: group.description,
        type: group.type ?? existing?.type ?? 'Customer',
        status: group.status ?? existing?.status ?? 'Active',
        ownerId: group.ownerId,
        metadata: group.metadata,
      };
      accountGroups.set(merged.id, merged);
    }
    return Response.json({ ok: true });
  }

  // Everything below is the ledger service's own surface — logged for "no call reached the
  // ledger service" assertions (DRK-1679 §5 "The console refuses a route its contract does
  // not declare").
  let loggedBody: unknown;
  if (!['GET', 'HEAD'].includes(request.method)) {
    try {
      loggedBody = await request.clone().json();
    } catch {
      loggedBody = undefined;
    }
  }
  requestLog.push({ method: request.method, path: url.pathname, headers: Object.fromEntries(request.headers), body: loggedBody });

  if (segments[0] !== 'v1') {
    return refusal(404, [{ message: 'Not found.' }]);
  }

  if (segments[1] === 'accounts' && segments[2] === 'balances' && request.method === 'GET') {
    const lines = [...accounts.values()].reduce<Map<string, number>>((sum, account) => {
      sum.set(account.currency, (sum.get(account.currency) ?? 0) + Number(account.balance));
      return sum;
    }, new Map());
    return Response.json([...lines.entries()].map(([currency, balance]) => ({ currency, balance: String(balance) })));
  }

  if (segments[1] === 'accounts' && segments[3] === 'balance' && request.method === 'GET') {
    const account = accounts.get(segments[2]);
    if (!account) return refusal(404, [{ message: 'Account not found.' }]);
    return Response.json(accountBalanceDto(account));
  }

  if (segments[1] === 'accounts' && segments[3] === 'statement' && request.method === 'GET') {
    const accountNumber = segments[2];
    const items = postings.filter((posting) => posting.accountId === accountNumber);
    return Response.json({ items, pageIndex: 0, pageSize: items.length, pageCount: 1, hasNextPage: false });
  }

  // --- Currencies (DRK-1697 §3a) --------------------------------------------------------

  if (segments[1] === 'currencies' && segments.length === 2 && request.method === 'GET') {
    return Response.json(currencies.map(currencyDto));
  }

  if (segments[1] === 'currencies' && segments.length === 2 && request.method === 'POST') {
    const body = (await request.json()) as { code: string; name: string; decimalPlaces: number };
    if (currencies.some((c) => c.code === body.code)) {
      return refusal(422, [{ message: `Code ${body.code} is already registered.`, code: 'DUPLICATE_CURRENCY_CODE', field: 'Code' }]);
    }
    const created: CurrencyFixture = { id: randomUUID(), code: body.code, name: body.name, decimalPlaces: body.decimalPlaces, isActive: true };
    currencies.push(created);
    return Response.json(currencyDto(created), { status: 201 });
  }

  if (segments[1] === 'currencies' && segments.length === 3 && request.method === 'GET') {
    const currency = currencies.find((c) => c.id === segments[2]);
    if (!currency) return refusal(404, [{ message: 'Currency not found.' }]);
    return Response.json(currencyDto(currency));
  }

  if (segments[1] === 'currencies' && segments.length === 3 && request.method === 'PUT') {
    const currency = currencies.find((c) => c.id === segments[2]);
    if (!currency) return refusal(404, [{ message: 'Currency not found.' }]);
    const body = (await request.json()) as { name?: string | null };
    if (body.name === undefined || body.name === null) {
      return refusal(400, [{ message: 'At least one field must be supplied.' }]);
    }
    currency.name = body.name;
    return Response.json(currencyDto(currency));
  }

  if (segments[1] === 'currencies' && segments[3] === 'activate' && request.method === 'POST') {
    const currency = currencies.find((c) => c.id === segments[2]);
    if (!currency) return refusal(404, [{ message: 'Currency not found.' }]);
    currency.isActive = true;
    return Response.json(currencyDto(currency));
  }

  if (segments[1] === 'currencies' && segments[3] === 'deactivate' && request.method === 'POST') {
    const currency = currencies.find((c) => c.id === segments[2]);
    if (!currency) return refusal(404, [{ message: 'Currency not found.' }]);
    const holdsBalance = [...accounts.values()].some((account) => account.currency === currency.code && Number(account.balance) !== 0);
    if (holdsBalance) {
      return refusal(422, [{ message: `An account in ${currency.code} still holds a balance.`, code: 'CURRENCY_HOLDS_BALANCE' }]);
    }
    currency.isActive = false;
    return Response.json(currencyDto(currency));
  }

  // --- Account groups (DRK-1697 §3a) ----------------------------------------------------

  if (segments[1] === 'account-groups' && segments.length === 2 && request.method === 'GET') {
    const filters = parseFilters(url);
    const orderBy = url.searchParams.get('orderBy');
    const desc = url.searchParams.get('desc') === 'true';
    const pageNumber = Number(url.searchParams.get('pageNumber') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '1000');
    const search = url.searchParams.get('search');

    let records = [...accountGroups.values()] as unknown as Record<string, unknown>[];
    records = records.filter((record) => matchesFilters(record, filters));
    if (search) {
      const needle = search.toLowerCase();
      records = records.filter((record) =>
        [record.code, record.name, record.description, record.ownerId].some((field) => String(field ?? '').toLowerCase().includes(needle)),
      );
    }
    records = sortRecords(records, orderBy, desc);
    const paged = pageOf(records as unknown as AccountGroupFixture[], pageNumber, pageSize);
    return Response.json({ ...paged, items: paged.items.map(accountGroupDto) });
  }

  if (segments[1] === 'account-groups' && segments.length === 2 && request.method === 'POST') {
    const body = (await request.json()) as {
      code: string;
      name: string;
      description?: string;
      type: AccountGroupType;
      ownerId: string;
      metadata?: Record<string, string>;
    };
    if ([...accountGroups.values()].some((g) => g.code === body.code)) {
      return refusal(422, [{ message: `Code ${body.code} is already used by an existing group.`, code: 'DUPLICATE_GROUP_CODE', field: 'Code' }]);
    }
    const created: AccountGroupFixture = {
      id: randomUUID(),
      code: body.code,
      name: body.name,
      description: body.description,
      type: body.type,
      status: 'Active',
      ownerId: body.ownerId,
      metadata: body.metadata,
    };
    accountGroups.set(created.id, created);
    return Response.json(accountGroupDto(created), { status: 201 });
  }

  if (segments[1] === 'account-groups' && segments.length === 3 && request.method === 'GET') {
    const group = accountGroups.get(segments[2]);
    if (!group) return refusal(404, [{ message: 'Account group not found.' }]);
    return Response.json(accountGroupDto(group));
  }

  if (segments[1] === 'account-groups' && segments.length === 3 && request.method === 'PUT') {
    const group = accountGroups.get(segments[2]);
    if (!group) return refusal(404, [{ message: 'Account group not found.' }]);
    const body = (await request.json()) as { name?: string | null; description?: string | null; metadata?: Record<string, string> | null };
    if (body.name == null && body.description == null && body.metadata == null) {
      return refusal(400, [{ message: 'At least one field must be supplied.' }]);
    }
    if (body.name != null) group.name = body.name;
    if (body.description != null) group.description = body.description;
    if (body.metadata != null) group.metadata = body.metadata;
    return Response.json(accountGroupDto(group));
  }

  if (segments[1] === 'account-groups' && segments.length === 3 && request.method === 'DELETE') {
    const group = accountGroups.get(segments[2]);
    if (!group) return refusal(404, [{ message: 'Account group not found.' }]);
    if (groupAccounts(group.id).length > 0) {
      return refusal(422, [{ message: `Group ${group.code} still holds an account.`, code: 'GROUP_NOT_EMPTY', field: 'Id' }]);
    }
    accountGroups.delete(group.id);
    return new Response(null, { status: 204 });
  }

  if (segments[1] === 'account-groups' && segments[3] === 'close' && request.method === 'POST') {
    const group = accountGroups.get(segments[2]);
    if (!group) return refusal(404, [{ message: 'Account group not found.' }]);
    const holdsBalance = groupAccounts(group.id).some((account) => Number(account.balance) !== 0);
    if (holdsBalance) {
      return refusal(422, [{ message: `Group ${group.code} holds an account with a balance.`, code: 'GROUP_HOLDS_BALANCE' }]);
    }
    group.status = 'Closed';
    return Response.json(accountGroupDto(group));
  }

  if (segments[1] === 'account-groups' && segments[3] === 'activate' && request.method === 'POST') {
    const group = accountGroups.get(segments[2]);
    if (!group) return refusal(404, [{ message: 'Account group not found.' }]);
    group.status = 'Active';
    return Response.json(accountGroupDto(group));
  }

  if (segments[1] === 'account-groups' && segments[3] === 'balances' && request.method === 'GET') {
    const group = accountGroups.get(segments[2]);
    if (!group) return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
    const byCurrency = new Map<string, { balance: string[]; available: string[]; held: string[] }>();
    for (const account of groupAccounts(group.id)) {
      const current = byCurrency.get(account.currency) ?? { balance: [], available: [], held: [] };
      current.balance.push(account.balance);
      current.available.push(account.availableBalance);
      current.held.push(account.heldAmount);
      byCurrency.set(account.currency, current);
    }
    const lines = [...byCurrency.entries()].map(([currency, totals]) =>
      balanceLineJson(currency, addDecimalStrings(totals.balance), addDecimalStrings(totals.available), addDecimalStrings(totals.held)),
    );
    return new Response(`[${lines.join(',')}]`, { status: 200, headers: { 'content-type': 'application/json' } });
  }

  if (segments[1] === 'currencies' && request.method === 'GET') {
    return Response.json(currencies.map(currencyDto));
  }

  if (segments[1] === 'postings' && segments.length === 2 && request.method === 'GET') {
    const search = url.searchParams.get('search');
    if (search !== null && search.length < 2) {
      return refusal(400, [{ message: 'Search term must be at least 2 characters.' }]);
    }
    const accountId = url.searchParams.get('accountId');
    const items = accountId ? postings.filter((posting) => posting.accountId === accountId) : postings;
    return Response.json({ items, pageIndex: 0, pageSize: items.length, pageCount: 1, hasNextPage: false });
  }

  if (segments[1] === 'postings' && segments.length === 2 && request.method === 'POST') {
    const idempotencyKey = request.headers.get('idempotency-key');
    if (!idempotencyKey) {
      return refusal(400, [{ message: 'Idempotency-Key header is required.', field: 'Idempotency-Key' }]);
    }
    const body = (await request.json()) as {
      accountId: string;
      direction: 'Debit' | 'Credit';
      amount: string;
      currency: string;
      category: string;
      description?: string;
      effectiveDate?: string;
    };
    const bodyHash = JSON.stringify(body);
    const replay = idempotencyResponses.get(idempotencyKey);
    if (replay) {
      if (replay.bodyHash !== bodyHash) {
        return refusal(409, [{ message: 'Idempotency key reused with different content.', code: 'IDEMPOTENCY_KEY_CONFLICT' }]);
      }
      return Response.json(replay.body, { status: 200 });
    }

    const account = accounts.get(body.accountId);
    if (!account) return refusal(404, [{ message: 'Account not found.' }]);

    if (body.effectiveDate && body.effectiveDate > new Date().toISOString().slice(0, 10)) {
      const result = refusal(422, [{ message: 'Effective date is later than the recording date.', code: 'EFFECTIVE_DATE_IN_FUTURE', field: 'effectiveDate' }]);
      idempotencyResponses.set(idempotencyKey, { bodyHash, status: 422, body: await result.clone().json() });
      return result;
    }

    const signedAmount = body.direction === 'Debit' ? -Number(body.amount) : Number(body.amount);
    const balanceAfter = Number(account.balance) + signedAmount;
    if (body.direction === 'Debit' && balanceAfter < computeFloor(account)) {
      const result = refusal(422, [{ message: 'The debit would take the account past its floor.', code: 'INSUFFICIENT_FUNDS' }]);
      idempotencyResponses.set(idempotencyKey, { bodyHash, status: 422, body: await result.clone().json() });
      return result;
    }

    account.balance = String(balanceAfter);
    account.availableBalance = String(balanceAfter);
    postingCounter += 1;
    const posting: PostingRecord = {
      id: randomUUID(),
      postingNumber: `PST${String(postingCounter).padStart(10, '0')}`,
      accountId: body.accountId,
      streamPosition: postings.filter((p) => p.accountId === body.accountId).length + 1,
      direction: body.direction,
      amount: body.amount,
      signedAmount: String(signedAmount),
      currency: body.currency,
      status: 'Posted',
      category: body.category,
      description: body.description,
      effectiveDate: body.effectiveDate,
    };
    postings.push(posting);
    idempotencyResponses.set(idempotencyKey, { bodyHash, status: 201, body: posting });
    return Response.json(posting, { status: 201 });
  }

  return refusal(404, [{ message: 'Not found.' }]);
}

const server = createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', async () => {
    const body = Buffer.concat(chunks);
    const request = new Request(`http://127.0.0.1:${PORT}${req.url}`, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: ['GET', 'HEAD'].includes(req.method ?? 'GET') || body.length === 0 ? undefined : body,
    });
    try {
      const response = await handle(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(String(error));
    }
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`fake-ledger-service listening on ${PORT}`);
});
