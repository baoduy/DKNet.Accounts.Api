/**
 * A minimal, in-memory stand-in for the ledger service (`DKNet.Accounts.Api`'s own HTTP
 * surface), mirroring `fake-oidc-issuer.ts`'s shape. The pass-through endpoint (DRK-1684
 * §3 row 5) is the only production caller; this fake is also driven directly by tests that
 * need to seed state or assert what was (or was not) called.
 *
 * Response shapes follow `README.md`'s "Refusals and error codes" table verbatim:
 * `{ status, errors: [{ message, code?, field? }], traceId }`.
 *
 * Every money field (`balance`, `availableBalance`, `heldAmount`, `floor`, `overdraftLimit`,
 * `minimumBalance`, `amount`, `signedAmount`, `balanceAfter`) is emitted as an **unquoted
 * JSON numeric literal**, carrying the seeded decimal text verbatim — the way the real
 * service serializes `decimal` (DRK-1696 §3 row 1). `jsonResponse`/`serialize` below build
 * the response body as text so a money value never passes through `Number` or
 * `JSON.stringify`, which would round it past `Number.MAX_SAFE_INTEGER`.
 *
 * Endpoints:
 *   GET    /v1/accounts                 (?filter=, ?search=, ?orderBy=, ?desc=, ?pageNumber=, ?pageSize=)
 *   GET    /v1/accounts/:id             (id or accountNumber)
 *   POST   /v1/accounts
 *   PUT    /v1/accounts/:id
 *   PATCH  /v1/accounts/:id
 *   GET    /v1/accounts/:accountNumber/balance
 *   GET    /v1/accounts/balances
 *   GET    /v1/accounts/:accountNumber/statement
 *   GET    /v1/account-groups
 *   GET    /v1/postings                 (?search=, ?accountId=, ?from=, ?to=, ?direction=, ?category=, ?status=)
 *   POST   /v1/postings                 (header: Idempotency-Key)
 *   POST   /v1/postings/:id/reverse     (header: Idempotency-Key, body: reason)
 *   GET    /v1/currencies
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
  id: string;
  accountNumber: string;
  groupId: string;
  name: string;
  classification: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
  status: 'Active' | 'Frozen' | 'Dormant' | 'Closed';
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
  openedOn: string;
  closedOn?: string | null;
  streamPosition: number;
}

interface AccountGroupFixture {
  id: string;
  code: string;
  name: string;
  type: string;
  status: 'Active' | 'Closed';
  ownerId?: string;
  description?: string;
  metadata?: Record<string, string>;
}

interface CurrencyFixture {
  code: string;
  decimalPlaces: number;
}

interface PostingRecord {
  id: string;
  postingNumber: string;
  accountId: string;
  streamPosition: number;
  direction: 'Debit' | 'Credit';
  amount: string;
  signedAmount: string;
  balanceAfter: string;
  currency: string;
  status: 'Posted' | 'Reversed';
  category: string;
  description?: string;
  effectiveDate?: string;
  reversesPostingId?: string;
  reversedByPostingId?: string;
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

let accounts = new Map<string, AccountFixture>();
let accountGroups = new Map<string, AccountGroupFixture>();
let currencies: CurrencyFixture[] = [{ code: 'SGD', decimalPlaces: 2 }, { code: 'JPY', decimalPlaces: 0 }, { code: 'BHD', decimalPlaces: 3 }];
let postings: PostingRecord[] = [];
let postingCounter = 0;
let accountCounter = 0;
const idempotencyResponses = new Map<string, { bodyHash: string; status: number; body: unknown }>();
const reverseIdempotencyResponses = new Map<string, { bodyHash: string; status: number; body: unknown }>();
let requestLog: RequestLogEntry[] = [];

function reset(): void {
  accounts = new Map();
  accountGroups = new Map();
  currencies = [{ code: 'SGD', decimalPlaces: 2 }, { code: 'JPY', decimalPlaces: 0 }, { code: 'BHD', decimalPlaces: 3 }];
  postings = [];
  postingCounter = 0;
  accountCounter = 0;
  idempotencyResponses.clear();
  reverseIdempotencyResponses.clear();
  requestLog = [];
}

/** Marks a value to be embedded as a raw, unquoted JSON numeric literal — never routed through `Number`. */
class RawMoney {
  constructor(public readonly text: string) {}
}

function money(text: string | number | null | undefined): RawMoney | null {
  if (text === undefined || text === null) return null;
  return new RawMoney(String(text));
}

/** Builds JSON text by hand so a `RawMoney` leaf is spliced in verbatim, unquoted. */
function serialize(value: unknown): string {
  if (value instanceof RawMoney) return value.text;
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map((item) => serialize(item)).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
    return `{${entries.map(([key, v]) => `${JSON.stringify(key)}:${serialize(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(serialize(body), { status, headers: { 'content-type': 'application/json' } });
}

/** Mirrors `AccountFloorPolicy.Floor` (`AccountFloorPolicy.cs:32-34`). */
function computeFloor(account: Pick<AccountFixture, 'permittedToGoNegative' | 'overdraftLimit' | 'minimumBalance'>): number | null {
  if (account.permittedToGoNegative) {
    if (account.overdraftLimit === undefined || account.overdraftLimit === null) return null;
    const overdraft = Number(account.overdraftLimit);
    const minimum = account.minimumBalance !== undefined && account.minimumBalance !== null ? Number(account.minimumBalance) : Number.MIN_SAFE_INTEGER;
    return Math.max(-overdraft, minimum);
  }
  const minimum = account.minimumBalance !== undefined && account.minimumBalance !== null ? Number(account.minimumBalance) : 0;
  return Math.max(0, minimum);
}

function refusal(status: number, errors: ErrorItem[]): Response {
  return jsonResponse({ status, errors, traceId: randomUUID() }, status);
}

function accountBalanceDto(account: AccountFixture): unknown {
  const floor = computeFloor(account);
  return {
    currency: account.currency,
    balance: money(account.balance),
    availableBalance: money(account.availableBalance),
    heldAmount: money(account.heldAmount),
    floor: floor === null ? null : money(String(floor)),
  };
}

function accountDto(account: AccountFixture): unknown {
  return {
    id: account.id,
    accountNumber: account.accountNumber,
    groupId: account.groupId,
    name: account.name,
    currency: account.currency,
    classification: account.classification,
    status: account.status,
    balance: money(account.balance),
    availableBalance: money(account.availableBalance),
    heldAmount: money(account.heldAmount),
    overdraftLimit: money(account.overdraftLimit),
    minimumBalance: money(account.minimumBalance),
    permittedToGoNegative: account.permittedToGoNegative,
    streamPosition: account.streamPosition,
    externalReference: account.externalReference ?? null,
    metadata: account.metadata ?? null,
    openedOn: account.openedOn,
    closedOn: account.closedOn ?? null,
  };
}

function postingDto(posting: PostingRecord): unknown {
  return {
    id: posting.id,
    postingNumber: posting.postingNumber,
    accountId: posting.accountId,
    streamPosition: posting.streamPosition,
    direction: posting.direction,
    amount: money(posting.amount),
    signedAmount: money(posting.signedAmount),
    balanceAfter: money(posting.balanceAfter),
    currency: posting.currency,
    status: posting.status,
    category: posting.category,
    description: posting.description ?? null,
    effectiveDate: posting.effectiveDate ?? null,
    reversesPostingId: posting.reversesPostingId ?? null,
    reversedByPostingId: posting.reversedByPostingId ?? null,
  };
}

function pagedEnvelope(items: unknown[], pageNumber: number, pageSize: number, totalItemCount: number): unknown {
  const pageCount = Math.max(1, Math.ceil(totalItemCount / pageSize));
  return {
    items,
    pageNumber,
    pageSize,
    pageCount,
    totalItemCount,
    hasNextPage: pageNumber < pageCount,
    hasPreviousPage: pageNumber > 1,
  };
}

const ACCOUNT_FILTER_FIELDS: Record<string, (account: AccountFixture) => string> = {
  accountnumber: (a) => a.accountNumber,
  groupid: (a) => a.groupId,
  name: (a) => a.name,
  classification: (a) => a.classification,
  status: (a) => a.status,
  currencycode: (a) => a.currency,
};

const ACCOUNT_ORDER_FIELDS: Record<string, (account: AccountFixture) => string | number> = {
  name: (a) => a.name,
  balance: (a) => Number(a.balance),
  accountnumber: (a) => a.accountNumber,
};

/** `Field:Operation:Value` triples — this fake only implements `Equal`, enough to drive the scenarios in play. */
function parseFilters(url: URL): Array<{ field: string; op: string; value: string }> | 'invalid' {
  const filters: Array<{ field: string; op: string; value: string }> = [];
  for (const raw of url.searchParams.getAll('filter')) {
    const [field, op, ...rest] = raw.split(':');
    if (!field || !op || rest.length === 0) return 'invalid';
    filters.push({ field: field.toLowerCase(), op, value: rest.join(':') });
  }
  return filters;
}

function nameLengthError(name: string): ErrorItem | null {
  return name.length > 200 ? { message: 'Name must be at most 200 characters.', field: 'name' } : null;
}

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);

  if (segments[0] === '__reset' && request.method === 'POST') {
    reset();
    return jsonResponse({ ok: true });
  }

  if (segments[0] === '__requests' && request.method === 'GET') {
    return jsonResponse(requestLog);
  }

  if (segments[0] === '__seed' && request.method === 'POST') {
    const seed = (await request.json()) as { accounts?: AccountFixture[]; accountGroups?: AccountGroupFixture[]; currencies?: CurrencyFixture[]; postings?: PostingRecord[] };
    for (const account of seed.accounts ?? []) {
      accounts.set(account.accountNumber, account);
    }
    for (const group of seed.accountGroups ?? []) {
      accountGroups.set(group.id, group);
    }
    for (const posting of seed.postings ?? []) {
      // Upsert by `id`, mirroring the `accounts`/`accountGroups` maps above — a scenario
      // re-seeding the same posting id (e.g. a reset racing the next test's own seed call,
      // since Playwright reporters cannot block a worker's test body) replaces it in place
      // instead of appending a second copy that never existed on the wire.
      const index = postings.findIndex((existing) => existing.id === posting.id);
      if (index >= 0) {
        postings[index] = posting;
      } else {
        postings.push(posting);
        postingCounter += 1;
      }
    }
    if (seed.currencies) currencies = seed.currencies;
    return jsonResponse({ ok: true });
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
  requestLog.push({ method: request.method, path: url.pathname + url.search, headers: Object.fromEntries(request.headers), body: loggedBody });

  if (segments[0] !== 'v1') {
    return refusal(404, [{ message: 'Not found.' }]);
  }

  function findAccount(idOrNumber: string): AccountFixture | undefined {
    return accounts.get(idOrNumber) ?? [...accounts.values()].find((a) => a.id === idOrNumber);
  }

  if (segments[1] === 'accounts' && segments[2] === 'balances' && request.method === 'GET') {
    const lines = [...accounts.values()].reduce<Map<string, number>>((sum, account) => {
      sum.set(account.currency, (sum.get(account.currency) ?? 0) + Number(account.balance));
      return sum;
    }, new Map());
    return jsonResponse([...lines.entries()].map(([currency, balance]) => ({ currency, balance: money(String(balance)) })));
  }

  if (segments[1] === 'accounts' && segments[3] === 'balance' && request.method === 'GET') {
    const account = findAccount(segments[2]);
    if (!account) return refusal(404, [{ message: 'Account not found.' }]);
    return jsonResponse(accountBalanceDto(account));
  }

  if (segments[1] === 'accounts' && segments[3] === 'statement' && request.method === 'GET') {
    const account = findAccount(segments[2]);
    const items = account ? postings.filter((posting) => posting.accountId === account.id) : [];
    return jsonResponse({ items: items.map(postingDto), pageIndex: 0, pageSize: items.length, pageCount: 1, hasNextPage: false });
  }

  if (segments[1] === 'accounts' && segments.length === 2 && request.method === 'GET') {
    const search = url.searchParams.get('search');
    if (search !== null && search.length < 2) {
      return refusal(400, [{ message: 'Search term must be at least 2 characters.' }]);
    }
    const filters = parseFilters(url);
    if (filters === 'invalid') return refusal(400, [{ message: 'Malformed filter.' }]);
    for (const filter of filters) {
      if (!ACCOUNT_FILTER_FIELDS[filter.field]) {
        return refusal(400, [{ message: `Unknown filter field '${filter.field}'.` }]);
      }
    }
    const orderByRaw = url.searchParams.get('orderBy');
    const orderBy = orderByRaw?.toLowerCase();
    if (orderBy && !ACCOUNT_ORDER_FIELDS[orderBy]) {
      return refusal(400, [{ message: `Unknown orderBy field '${orderByRaw}'.` }]);
    }

    let items = [...accounts.values()];
    for (const filter of filters) {
      const accessor = ACCOUNT_FILTER_FIELDS[filter.field];
      items = items.filter((account) => accessor(account).toLowerCase() === filter.value.toLowerCase());
    }
    if (search) {
      items = items.filter((account) => account.name.toLowerCase().includes(search.toLowerCase()) || account.accountNumber.toLowerCase().includes(search.toLowerCase()));
    }
    if (orderBy) {
      const accessor = ACCOUNT_ORDER_FIELDS[orderBy];
      const desc = url.searchParams.get('desc') === 'true';
      items = [...items].sort((a, b) => {
        const av = accessor(a);
        const bv = accessor(b);
        const diff = av < bv ? -1 : av > bv ? 1 : 0;
        return desc ? -diff : diff;
      });
    }

    const pageNumber = Math.max(1, Number(url.searchParams.get('pageNumber') ?? '1'));
    const pageSize = Math.min(1000, Math.max(1, Number(url.searchParams.get('pageSize') ?? '1000')));
    const totalItemCount = items.length;
    const page = items.slice((pageNumber - 1) * pageSize, (pageNumber - 1) * pageSize + pageSize);
    return jsonResponse(pagedEnvelope(page.map(accountDto), pageNumber, pageSize, totalItemCount));
  }

  if (segments[1] === 'accounts' && segments.length === 3 && request.method === 'GET') {
    const account = findAccount(segments[2]);
    if (!account) return refusal(404, [{ message: 'Account not found.' }]);
    return jsonResponse(accountDto(account));
  }

  if (segments[1] === 'accounts' && segments.length === 2 && request.method === 'POST') {
    const body = (await request.json()) as {
      groupId: string;
      name: string;
      currency: string;
      classification: AccountFixture['classification'];
      permittedToGoNegative: boolean;
      overdraftLimit?: string | null;
      minimumBalance?: string | null;
      externalReference?: string;
      metadata?: Record<string, string>;
    };

    const nameError = nameLengthError(body.name ?? '');
    if (nameError) return refusal(400, [nameError]);
    if (body.permittedToGoNegative && (body.overdraftLimit === undefined || body.overdraftLimit === null)) {
      return refusal(422, [{ message: 'An overdraft limit is required when the account is permitted to go negative.', code: 'OVERDRAFT_LIMIT_REQUIRED' }]);
    }
    if (!currencies.some((c) => c.code === body.currency)) {
      return refusal(422, [{ message: `Currency '${body.currency}' is not supported.`, code: 'UNSUPPORTED_CURRENCY' }]);
    }
    const group = accountGroups.get(body.groupId);

    accountCounter += 1;
    const accountNumber = `${group?.code ?? 'ACC'}-${String(accountCounter).padStart(6, '0')}`;
    const account: AccountFixture = {
      id: randomUUID(),
      accountNumber,
      groupId: body.groupId,
      name: body.name,
      classification: body.classification,
      status: 'Active',
      currency: body.currency,
      decimalPlaces: currencies.find((c) => c.code === body.currency)?.decimalPlaces ?? 2,
      balance: '0',
      availableBalance: '0',
      heldAmount: '0',
      permittedToGoNegative: body.permittedToGoNegative,
      overdraftLimit: body.overdraftLimit ?? null,
      minimumBalance: body.minimumBalance ?? null,
      externalReference: body.externalReference,
      metadata: body.metadata,
      openedOn: new Date().toISOString(),
      streamPosition: 0,
    };
    accounts.set(account.accountNumber, account);
    return jsonResponse(accountDto(account), 201);
  }

  if (segments[1] === 'accounts' && segments.length === 3 && request.method === 'PUT') {
    const account = findAccount(segments[2]);
    if (!account) return refusal(404, [{ message: 'Account not found.' }]);
    const body = (await request.json()) as { name?: string | null; metadata?: Record<string, string> | null };
    if (body.name === undefined && body.metadata === undefined) {
      return refusal(400, [{ message: 'At least one field must be supplied.' }]);
    }
    if (body.name !== undefined && body.name !== null) {
      const nameError = nameLengthError(body.name);
      if (nameError) return refusal(400, [nameError]);
      account.name = body.name;
    }
    if (body.metadata !== undefined && body.metadata !== null) account.metadata = body.metadata;
    return jsonResponse(accountDto(account));
  }

  if (segments[1] === 'accounts' && segments.length === 3 && request.method === 'PATCH') {
    const account = findAccount(segments[2]);
    if (!account) return refusal(404, [{ message: 'Account not found.' }]);
    const body = (await request.json()) as {
      status?: AccountFixture['status'];
      overdraftLimit?: string | null;
      minimumBalance?: string | null;
      permittedToGoNegative?: boolean;
    };

    if (body.status === 'Closed' && (Number(account.balance) !== 0 || Number(account.heldAmount) !== 0)) {
      return refusal(422, [
        { message: `The account holds ${account.balance} ${account.currency} and cannot be closed.`, code: 'ACCOUNT_HOLDS_BALANCE' },
      ]);
    }

    const permittedToGoNegative = body.permittedToGoNegative ?? account.permittedToGoNegative;
    const overdraftLimit = body.overdraftLimit !== undefined ? body.overdraftLimit : account.overdraftLimit;
    if (permittedToGoNegative && (overdraftLimit === undefined || overdraftLimit === null)) {
      return refusal(422, [{ message: 'An overdraft limit is required when the account is permitted to go negative.', code: 'OVERDRAFT_LIMIT_REQUIRED' }]);
    }

    if (body.permittedToGoNegative !== undefined) account.permittedToGoNegative = body.permittedToGoNegative;
    if (body.overdraftLimit !== undefined) account.overdraftLimit = body.overdraftLimit;
    if (body.minimumBalance !== undefined) account.minimumBalance = body.minimumBalance;
    if (body.status !== undefined) {
      account.status = body.status;
      account.closedOn = body.status === 'Closed' ? new Date().toISOString() : null;
    }
    return jsonResponse(accountDto(account));
  }

  if (segments[1] === 'account-groups' && segments.length === 2 && request.method === 'GET') {
    const items = [...accountGroups.values()];
    return jsonResponse(pagedEnvelope(items, 1, 1000, items.length));
  }

  if (segments[1] === 'currencies' && request.method === 'GET') {
    return jsonResponse(currencies);
  }

  if (segments[1] === 'postings' && segments.length === 2 && request.method === 'GET') {
    const search = url.searchParams.get('search');
    if (search !== null && search.length < 2) {
      return refusal(400, [{ message: 'Search term must be at least 2 characters.' }]);
    }
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    if (from || to) {
      if (!from || !to) {
        return refusal(422, [{ message: 'Both from and to are required.', code: 'INVALID_DATE_RANGE' }]);
      }
      const spanDays = (Date.parse(to) - Date.parse(from)) / 86_400_000;
      if (spanDays > 90) {
        return refusal(422, [{ message: 'The date range may span at most 90 days.', code: 'INVALID_DATE_RANGE' }]);
      }
    }

    const accountId = url.searchParams.get('accountId');
    const account = accountId ? findAccount(accountId) : undefined;
    let items = accountId ? postings.filter((posting) => posting.accountId === (account?.id ?? accountId)) : postings;

    const direction = url.searchParams.get('direction');
    if (direction) items = items.filter((posting) => posting.direction === direction);
    const category = url.searchParams.get('category');
    if (category) items = items.filter((posting) => posting.category === category);
    const status = url.searchParams.get('status');
    if (status) items = items.filter((posting) => posting.status === status);

    return jsonResponse({ items: items.map(postingDto), pageIndex: 0, pageSize: items.length, pageCount: 1, hasNextPage: false });
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
      return jsonResponse(replay.body, replay.status);
    }

    const account = findAccount(body.accountId);
    if (!account) return refusal(404, [{ message: 'Account not found.' }]);

    if (body.effectiveDate && body.effectiveDate > new Date().toISOString().slice(0, 10)) {
      const errors = [{ message: 'Effective date is later than the recording date.', code: 'EFFECTIVE_DATE_IN_FUTURE', field: 'effectiveDate' }];
      idempotencyResponses.set(idempotencyKey, { bodyHash, status: 422, body: { status: 422, errors, traceId: randomUUID() } });
      return refusal(422, errors);
    }

    const signedAmount = body.direction === 'Debit' ? -Number(body.amount) : Number(body.amount);
    const balanceAfter = Number(account.balance) + signedAmount;
    const floor = computeFloor(account);
    if (body.direction === 'Debit' && floor !== null && balanceAfter < floor) {
      const errors = [{ message: 'The debit would take the account past its floor.', code: 'INSUFFICIENT_FUNDS' }];
      idempotencyResponses.set(idempotencyKey, { bodyHash, status: 422, body: { status: 422, errors, traceId: randomUUID() } });
      return refusal(422, errors);
    }

    account.balance = String(balanceAfter);
    account.availableBalance = String(balanceAfter);
    postingCounter += 1;
    account.streamPosition += 1;
    const posting: PostingRecord = {
      id: randomUUID(),
      postingNumber: `PST${String(postingCounter).padStart(10, '0')}`,
      accountId: account.id,
      streamPosition: account.streamPosition,
      direction: body.direction,
      amount: body.amount,
      signedAmount: String(signedAmount),
      balanceAfter: String(balanceAfter),
      currency: body.currency,
      status: 'Posted',
      category: body.category,
      description: body.description,
      effectiveDate: body.effectiveDate,
    };
    postings.push(posting);
    const responseBody = postingDto(posting);
    idempotencyResponses.set(idempotencyKey, { bodyHash, status: 201, body: responseBody });
    return jsonResponse(responseBody, 201);
  }

  if (segments[1] === 'postings' && segments[3] === 'reverse' && request.method === 'POST') {
    const idempotencyKey = request.headers.get('idempotency-key');
    if (!idempotencyKey) {
      return refusal(400, [{ message: 'Idempotency-Key header is required.', field: 'Idempotency-Key' }]);
    }
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    if (!body.reason) {
      return refusal(400, [{ message: 'A reason is required.', field: 'reason' }]);
    }

    const bodyHash = JSON.stringify(body);
    const replay = reverseIdempotencyResponses.get(idempotencyKey);
    if (replay) {
      if (replay.bodyHash !== bodyHash) {
        return refusal(409, [{ message: 'Idempotency key reused with different content.', code: 'IDEMPOTENCY_KEY_CONFLICT' }]);
      }
      return jsonResponse(replay.body, replay.status);
    }

    const posting = postings.find((p) => p.id === segments[2]);
    if (!posting) return refusal(404, [{ message: 'Posting not found.' }]);
    if (posting.status === 'Reversed') {
      const errors = [{ message: 'This posting has already been reversed.', code: 'POSTING_ALREADY_REVERSED' }];
      reverseIdempotencyResponses.set(idempotencyKey, { bodyHash, status: 409, body: { status: 409, errors, traceId: randomUUID() } });
      return refusal(409, errors);
    }

    const account = accounts.get(posting.accountId) ?? [...accounts.values()].find((a) => a.id === posting.accountId);
    const reversedDirection = posting.direction === 'Debit' ? 'Credit' : 'Debit';
    const signedAmount = reversedDirection === 'Debit' ? -Number(posting.amount) : Number(posting.amount);
    const balanceAfter = account ? Number(account.balance) + signedAmount : signedAmount;
    if (account) {
      account.balance = String(balanceAfter);
      account.availableBalance = String(balanceAfter);
      account.streamPosition += 1;
    }
    postingCounter += 1;
    const reversal: PostingRecord = {
      id: randomUUID(),
      postingNumber: `PST${String(postingCounter).padStart(10, '0')}`,
      accountId: posting.accountId,
      streamPosition: account?.streamPosition ?? posting.streamPosition + 1,
      direction: reversedDirection,
      amount: posting.amount,
      signedAmount: String(signedAmount),
      balanceAfter: String(balanceAfter),
      currency: posting.currency,
      status: 'Posted',
      category: 'Reversal',
      description: body.reason,
      reversesPostingId: posting.id,
    };
    posting.status = 'Reversed';
    posting.reversedByPostingId = reversal.id;
    postings.push(reversal);
    const responseBody = postingDto(reversal);
    reverseIdempotencyResponses.set(idempotencyKey, { bodyHash, status: 200, body: responseBody });
    return jsonResponse(responseBody, 200);
  }

  if (segments[1] === 'postings' && segments.length === 3 && request.method === 'GET') {
    const posting = postings.find((p) => p.id === segments[2]);
    if (!posting) return refusal(404, [{ message: 'Posting not found.' }]);
    return jsonResponse(postingDto(posting));
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
