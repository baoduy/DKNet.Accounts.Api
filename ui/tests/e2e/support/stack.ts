/**
 * DRK-1725 §3 "The end-to-end check" — how the end-to-end checks (`tests/e2e/170-…` onward)
 * reach the stack the run started, and what they read back from docker. The names below are
 * the runner's contract with these checks (`playwright.e2e.config.ts` and its global setup):
 *
 * - The runner starts the repository's container stack (`docker-compose.yml` plus the test-only
 *   `docker-compose.e2e.yml`) under the compose project `dknet-e2e-<run id>`, where the run id is
 *   `CONSOLE_E2E_RUN_ID` when that is set and a fresh one otherwise, on free ports, with empty
 *   volumes, and removes it — containers, volumes, networks — when the run ends, pass or fail.
 * - It publishes the stack to the checks as JSON in `CONSOLE_E2E_STACK` (`E2eStack` below).
 *   `consoleBaseUrl` is the console as the checks' browser reaches it; the browser also reaches
 *   the stand-in sign-in server at the address the console redirects it to.
 * - The service runs with its permission checks on, trusting only the stand-in sign-in server.
 */
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';

export const E2E_STACK_ENV = 'CONSOLE_E2E_STACK';
export const E2E_RUN_ID_ENV = 'CONSOLE_E2E_RUN_ID';
export const E2E_PROJECT_PREFIX = 'dknet-e2e-';

export interface E2eStack {
  /** The compose project the run started — `dknet-e2e-<run id>`. */
  project: string;
  consoleBaseUrl: string;
}

export function e2eStack(): E2eStack {
  const published = process.env[E2E_STACK_ENV];
  if (!published) throw new Error(`${E2E_STACK_ENV} is not set: the end-to-end run did not publish its stack`);
  const stack = JSON.parse(published) as E2eStack;
  if (!stack.project.startsWith(E2E_PROJECT_PREFIX)) throw new Error(`the end-to-end stack's project ${stack.project} is not named ${E2E_PROJECT_PREFIX}<run id>`);
  return stack;
}

/**
 * The stand-in's own users (`tests/fakes/fake-oidc-issuer.ts`): Mai with every permission, and
 * Nam, who may read accounts and record nothing.
 */
export const MAI = 'mai-write@drunkcoding.net';
export const NAM = 'nam@drunkcoding.net';

export interface ComposeResources {
  containers: string[];
  volumes: string[];
  networks: string[];
}

function dockerNames(args: string[]): string[] {
  return execFileSync('docker', args, { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Everything docker holds for the compose project `project` — found by its label only. */
export function composeResources(project: string): ComposeResources {
  const label = `label=com.docker.compose.project=${project}`;
  return {
    containers: dockerNames(['ps', '-a', '--filter', label, '--format', '{{.Names}}']),
    volumes: dockerNames(['volume', 'ls', '--filter', label, '--format', '{{.Name}}']),
    networks: dockerNames(['network', 'ls', '--filter', label, '--format', '{{.Name}}']),
  };
}

/** The containers of `project` that are running right now. */
export function runningContainers(project: string): string[] {
  return dockerNames(['ps', '--filter', `label=com.docker.compose.project=${project}`, '--filter', 'status=running', '--format', '{{.Names}}']);
}

/**
 * One request through the console's own pass-through (`/api/ledger/…`), on behalf of whoever is
 * signed in on `page` — the service sees that operator's stand-in token.
 */
export async function throughConsole(
  page: Page,
  stack: E2eStack,
  method: 'GET' | 'POST',
  route: string,
  body?: unknown,
): Promise<{ status: number; body: unknown }> {
  const response = await page.request.fetch(`${stack.consoleBaseUrl}/api/ledger/${route}`, {
    method,
    data: body,
    headers: method === 'POST' ? { 'idempotency-key': randomUUID() } : {},
    failOnStatusCode: false,
  });
  const text = await response.text();
  return { status: response.status(), body: text ? (JSON.parse(text) as unknown) : null };
}

async function landed(page: Page, stack: E2eStack, method: 'GET' | 'POST', route: string, body?: unknown): Promise<Record<string, unknown>> {
  const response = await throughConsole(page, stack, method, route, body);
  if (response.status >= 300) throw new Error(`${method} ${route} did not land: ${response.status} ${JSON.stringify(response.body)}`);
  return response.body as Record<string, unknown>;
}

// ponytail: two decimal places, the scale of every currency these checks use (SGD); take the
// scale from the currency's own record if a check ever seeds another.
function cents(amount: unknown): bigint {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(String(amount));
  if (!match) throw new Error(`not an amount at 2 decimal places: ${String(amount)}`);
  const value = BigInt(match[2]) * 100n + BigInt((match[3] ?? '').padEnd(2, '0'));
  return match[1] ? -value : value;
}

function amount(value: bigint): string {
  return `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
}

/**
 * Makes the ledger hold `accountNumber` (`<group code>-<suffix>`) at exactly `balance`, whatever
 * an earlier check left behind: opens its group and the account when they are missing, and
 * records the one credit or debit that brings the balance to `balance`. Runs as the operator
 * signed in on `page`, who must be allowed to write. Returns the account's id.
 */
export async function holdAccountAt(page: Page, stack: E2eStack, accountNumber: string, balance: string, currency = 'SGD'): Promise<string> {
  const [code, suffix] = accountNumber.split('-');
  const byNumber = (await landed(page, stack, 'GET', `accounts?filter=AccountNumber:Equal:${accountNumber}`)).items as { id: string }[];
  let accountId = byNumber[0]?.id;
  if (!accountId) {
    const byCode = (await landed(page, stack, 'GET', `account-groups?filter=Code:Equal:${code}`)).items as { id: string }[];
    const groupId = byCode[0]?.id ?? ((await landed(page, stack, 'POST', 'account-groups', { code, name: `${code} group`, type: 'Customer', ownerId: `${code.toLowerCase()}-owner` })).id as string);
    accountId = (await landed(page, stack, 'POST', 'accounts', { groupId, accountNumber: suffix, name: `${code} operating`, currency, classification: 'Liability', permittedToGoNegative: false })).id as string;
  }

  const held = cents((await landed(page, stack, 'GET', `accounts/${accountId}/balance`)).balance);
  const gap = cents(balance) - held;
  if (gap !== 0n) {
    await landed(page, stack, 'POST', 'postings', {
      accountId,
      direction: gap > 0n ? 'Credit' : 'Debit',
      amount: amount(gap > 0n ? gap : -gap),
      currency,
      category: 'Transfer',
    });
  }
  return accountId;
}
