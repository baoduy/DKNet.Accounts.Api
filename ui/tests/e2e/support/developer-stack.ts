/**
 * DRK-1725 §5 "The end-to-end check leaves a developer's stack alone, pass or fail" — a
 * developer's checkout with its own stack running, and the end-to-end check run from that same
 * checkout as a developer runs it (`pnpm run test:e2e`).
 *
 * The developer's checkout is a copy of this one in a scratch folder, set up the way
 * `.env.sample` says to: `cp .env.sample .env`, then `docker compose up`, under the stack name
 * compose derives from the checkout's folder. Being a copy, it never touches a stack a real
 * developer runs from this checkout (brief DRK-1730 R1); the check removes it when done. Only
 * three things differ from `.env.sample`: the service side only (`COMPOSE_PROFILES=api`, a setup
 * `.env.sample` names), free ports instead of its fixed ones, and an image tag of its own
 * (`docker-compose.developer.yml`), so a real developer's `dknet-accounts-api:local` is never
 * rebuilt from this copy.
 */
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePorts } from '../../support/run';
import { copyCheckout } from './checkout-copy';
import { E2E_PROJECT_PREFIX, E2E_RUN_ID_ENV, E2E_STACK_ENV, runningContainers } from './stack';

export interface DeveloperStack {
  /** The developer's checkout — the repository root of the copy. */
  checkout: string;
  /** The stack name compose gives it by default: the checkout folder's name. */
  project: string;
  apiBaseUrl: string;
  image: string;
}

const DEVELOPER_OVERRIDE = 'docker-compose.developer.yml';

function compose(stack: DeveloperStack, args: string[]): string {
  return execFileSync('docker', ['compose', '-f', 'docker-compose.yml', '-f', DEVELOPER_OVERRIDE, ...args], {
    cwd: stack.checkout,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function api(stack: DeveloperStack, method: 'GET' | 'POST', route: string, body?: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(`${stack.apiBaseUrl}/v1/${route}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} ${route} on the developer's stack: ${response.status} ${await response.text()}`);
  return (await response.json()) as Record<string, unknown>;
}

/** A developer's checkout with the service side of its stack running, holding DEV-000001. */
export async function startDeveloperStack(): Promise<DeveloperStack> {
  const id = randomUUID().slice(0, 8);
  const checkout = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'developer-')), `devcheckout${id}`);
  const [apiPort, consolePort] = freePorts(2);
  const stack: DeveloperStack = { checkout, project: `devcheckout${id}`, apiBaseUrl: `http://127.0.0.1:${apiPort}`, image: `dknet-accounts-api:developer-${id}` };

  copyCheckout(checkout, 'ignore');
  const sample = fs.readFileSync(path.join(checkout, '.env.sample'), 'utf8');
  fs.writeFileSync(
    path.join(checkout, '.env'),
    sample
      .replace(/^COMPOSE_PROFILES=.*$/m, 'COMPOSE_PROFILES=api')
      .replace(/^API_PORT=.*$/m, `API_PORT=${apiPort}`)
      .replace(/^CONSOLE_PORT=.*$/m, `CONSOLE_PORT=${consolePort}`),
  );
  fs.writeFileSync(path.join(checkout, DEVELOPER_OVERRIDE), JSON.stringify({ services: { api: { image: stack.image } } }, null, 2));

  compose(stack, ['up', '--build', '--wait', '--wait-timeout', '600']);

  const group = await api(stack, 'POST', 'account-groups', { code: 'DEV', name: 'Developer group', type: 'Customer', ownerId: 'developer' });
  // Opening an account takes a signed-in calling system, which a developer's stack gets from their
  // own directory and this one has none of — so the account is written into the stack's database.
  compose(stack, [
    'exec',
    '-T',
    'postgres',
    'psql',
    '-v',
    'ON_ERROR_STOP=1',
    '-U',
    'accounts',
    '-d',
    'accounts',
    '-c',
    `INSERT INTO pro."Accounts" ("Id", "GroupId", "AccountNumber", "Name", "CurrencyCode", "Classification", "Status", "Balance", "HeldAmount", "PermittedToGoNegative", "StreamPosition", "CreatedBy", "CreatedOn")
     VALUES (gen_random_uuid(), '${String(group.id)}', 'DEV-000001', 'Developer account', 'SGD', 'Liability', 'Active', 0, 0, false, 0, 'developer', now())`,
  ]);
  return stack;
}

/** Every container of the developer's stack, and whether each is running. */
export function developerServices(stack: DeveloperStack): Record<string, boolean> {
  const running = new Set(runningContainers(stack.project));
  const all = compose(stack, ['ps', '-a', '--format', '{{.Name}}'])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return Object.fromEntries(all.map((name) => [name, running.has(name)]));
}

export async function developerStackHolds(stack: DeveloperStack, accountNumber: string): Promise<boolean> {
  const found = (await api(stack, 'GET', `accounts?filter=AccountNumber:Equal:${accountNumber}`)).items as { accountNumber: string }[];
  return found.some((account) => account.accountNumber === accountNumber);
}

export function removeDeveloperStack(stack: DeveloperStack): void {
  try {
    compose(stack, ['down', '-v', '--remove-orphans']);
    execFileSync('docker', ['image', 'rm', '-f', stack.image], { stdio: 'ignore' });
  } finally {
    fs.rmSync(path.dirname(stack.checkout), { recursive: true, force: true });
  }
}

export interface EndToEndRun {
  code: number | null;
  output: string;
  /** The compose project the run was told to use. */
  project: string;
  /** Whether a container of that project was ever seen running while the run was going. */
  stackSeenRunning: boolean;
}

/**
 * Runs `pnpm run test:e2e <args>` from the `ui/` of `checkout` as a run of its own: none of this
 * run's published stack or acceptance-run state is handed down, only the run id it must name its
 * project with.
 */
export function runEndToEndCheck(checkout: string, args: string[], timeoutMs: number): Promise<EndToEndRun> {
  const runId = `nested${randomUUID().slice(0, 8)}`;
  const project = `${E2E_PROJECT_PREFIX}${runId}`;
  const env: NodeJS.ProcessEnv = { ...process.env, [E2E_RUN_ID_ENV]: runId };
  for (const key of Object.keys(env)) {
    if ([E2E_STACK_ENV, 'CONSOLE_ACCEPTANCE_RUN', 'TEST_WORKER_INDEX', 'TEST_PARALLEL_INDEX'].includes(key) || key.startsWith('PW_')) delete env[key];
  }
  const child = spawn('pnpm', ['run', 'test:e2e', ...args], {
    cwd: path.join(checkout, 'ui'),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  let output = '';
  child.stdout?.on('data', (chunk) => (output += String(chunk)));
  child.stderr?.on('data', (chunk) => (output += String(chunk)));

  let stackSeenRunning = false;
  const watch = setInterval(() => {
    if (!stackSeenRunning) stackSeenRunning = runningContainers(project).length > 0;
  }, 1_000);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      clearInterval(watch);
      if (child.pid !== undefined) process.kill(-child.pid, 'SIGINT');
      reject(new Error(`the end-to-end check did not finish within ${timeoutMs}ms — output:\n${output}`));
    }, timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      clearInterval(watch);
      resolve({ code, output, project, stackSeenRunning });
    });
  });
}
