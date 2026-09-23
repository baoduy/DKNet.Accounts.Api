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

let accounts = new Map<string, AccountFixture>();
let currencies: CurrencyFixture[] = [{ code: 'SGD', decimalPlaces: 2 }, { code: 'JPY', decimalPlaces: 0 }, { code: 'BHD', decimalPlaces: 3 }];
let postings: PostingRecord[] = [];
let postingCounter = 0;
const idempotencyResponses = new Map<string, { bodyHash: string; status: number; body: unknown }>();
let requestLog: RequestLogEntry[] = [];

function reset(): void {
  accounts = new Map();
  currencies = [{ code: 'SGD', decimalPlaces: 2 }, { code: 'JPY', decimalPlaces: 0 }, { code: 'BHD', decimalPlaces: 3 }];
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
    const seed = (await request.json()) as { accounts?: AccountFixture[]; currencies?: CurrencyFixture[] };
    for (const account of seed.accounts ?? []) {
      accounts.set(account.accountNumber, account);
    }
    if (seed.currencies) currencies = seed.currencies;
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

  if (segments[1] === 'currencies' && request.method === 'GET') {
    return Response.json(currencies);
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
