/**
 * DRK-1796 — the AppHost demo, run the way a developer runs it: `dotnet run` on the AppHost project, with no
 * Entra ID values. Its wiring is read from Aspire's own manifest (`--publisher manifest`), never from the
 * program's text: which Keycloak it starts and what it hands the console (`CONSOLE_ENTRA_*`).
 *
 * The console the checks drive is this run's own `next dev`, started with exactly the `CONSOLE_ENTRA_*` values
 * the AppHost gives its console, against this run's cache and stand-in ledger — so a busy port 3000 or 5000, which
 * only the AppHost's own console and Api need, changes nothing. Keycloak is the running AppHost's.
 */
import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import { connect } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { expect } from '@playwright/test';
import { CONSOLE_REDIS_KEY_PREFIX, FAKE_LEDGER_BASE, FAKE_REDIS_URL, SESSION_SECRET, TOKEN_ENCRYPTION_KEY } from '../../support/fixtures';
import { UI_ROOT } from '../../support/run';

const REPO_ROOT = path.resolve(UI_ROOT, '..');
const APPHOST_DIR = path.join(REPO_ROOT, 'ApiEndpoints', 'DKNet.Accounts.AppHost');
const APPHOST_PROJECT = path.join(APPHOST_DIR, 'DKNet.Accounts.AppHost.csproj');

/** DRK-1796 §9 Q2 — the demo realm, and Keycloak's fixed port (R1). */
export const REALM = 'dknet-accounts';
export const KEYCLOAK_PORT = 8180;
export const KEYCLOAK_BASE = `http://localhost:${KEYCLOAK_PORT}`;
export const REALM_ISSUER = `${KEYCLOAK_BASE}/realms/${REALM}`;

/** DRK-1796 §3: the admin screen login the AppHost sets as parameters. */
const ADMIN_LOGIN = 'admin';

const START_TIMEOUT_MS = 6 * 60_000;
const STOP_TIMEOUT_MS = 60_000;

/** The `CONSOLE_ENTRA_*` values the AppHost must set for its console (R6: every one, never blank). */
export const CONSOLE_SIGN_IN_KEYS = [
  'CONSOLE_ENTRA_ISSUER_BASE_URL',
  'CONSOLE_ENTRA_TENANT_ID',
  'CONSOLE_ENTRA_CLIENT_ID',
  'CONSOLE_ENTRA_CLIENT_SECRET',
  'CONSOLE_ENTRA_SCOPES',
] as const;

interface ManifestResource {
  type: string;
  image?: string;
  env?: Record<string, string>;
  bindings?: Record<string, { port?: number; targetPort?: number; scheme?: string }>;
}

export interface Manifest {
  resources: Record<string, ManifestResource>;
}

let manifest: Manifest | undefined;

/** The AppHost's Aspire manifest, published once per run. */
export function appHostManifest(): Manifest {
  if (manifest) return manifest;
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'apphost-manifest-'));
  try {
    const file = path.join(out, 'aspire-manifest.json');
    execFileSync('dotnet', ['run', '--project', APPHOST_PROJECT, '--', '--publisher', 'manifest', '--output-path', file], { stdio: 'pipe' });
    manifest = JSON.parse(fs.readFileSync(file, 'utf8')) as Manifest;
    return manifest;
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
}

/** The one Keycloak container resource the AppHost starts. */
export function keycloakResource(): [string, ManifestResource] {
  const found = Object.entries(appHostManifest().resources).filter(([, r]) => /keycloak/i.test(r.image ?? ''));
  expect(found.map(([name]) => name), 'Keycloak container resources the AppHost starts').toHaveLength(1);
  return found[0];
}

/** A parameter's literal default in `AppHost.cs` (Aspire's manifest leaves it out). */
function parameterDefault(name: string): string | undefined {
  const source = fs.readFileSync(path.join(APPHOST_DIR, 'AppHost.cs'), 'utf8');
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`AddParameter\\(\\s*"${escaped}"\\s*,\\s*"([^"]*)"`).exec(source)?.[1];
}

/** A manifest value as it is on the developer's machine: the Keycloak endpoint is the fixed one, a parameter its default. */
function resolve(resource: string, key: string, value: string): string {
  const [keycloak] = keycloakResource();
  return value.replace(/\{([^.{}]+)\.([^{}]+)\}/g, (placeholder, name: string, property: string) => {
    if (name === keycloak && property === 'bindings.http.url') return KEYCLOAK_BASE;
    if (name === keycloak && property === 'bindings.http.host') return 'localhost';
    if (name === keycloak && property === 'bindings.http.port') return String(KEYCLOAK_PORT);
    if (property === 'value') {
      const fallback = parameterDefault(name);
      if (fallback !== undefined) return fallback;
    }
    throw new Error(`'${resource}' env ${key}: cannot resolve ${placeholder}`);
  });
}

/** The console resource: the AppHost's `pnpm dev` executable in `ui/`. */
function consoleResource(): [string, ManifestResource] {
  const found = Object.entries(appHostManifest().resources).filter(([, r]) => r.env && 'CONSOLE_API_BASE_URL' in r.env);
  expect(found.map(([name]) => name), 'console resources the AppHost starts').toHaveLength(1);
  return found[0];
}

/** What the AppHost hands its console for signing in — each value resolved and required non-blank (R6). */
export function appHostConsoleSignIn(): Record<(typeof CONSOLE_SIGN_IN_KEYS)[number], string> {
  const [name, resource] = consoleResource();
  const env = resource.env ?? {};
  const values = Object.fromEntries(CONSOLE_SIGN_IN_KEYS.map((key) => [key, key in env ? resolve(name, key, env[key]) : ''])) as Record<(typeof CONSOLE_SIGN_IN_KEYS)[number], string>;
  expect(CONSOLE_SIGN_IN_KEYS.filter((key) => !values[key].trim()), 'console sign-in values the AppHost leaves unset or blank').toEqual([]);
  expect(values.CONSOLE_ENTRA_ISSUER_BASE_URL, 'the console signs in through the AppHost Keycloak').toBe(`${KEYCLOAK_BASE}/realms`);
  expect(values.CONSOLE_ENTRA_TENANT_ID, 'the console signs in to the demo realm').toBe(REALM);
  return values;
}

/** The address the AppHost's own console runs on — the one the realm registers for it. */
function appHostConsoleCallback(): string {
  const [, resource] = consoleResource();
  const port = resource.bindings?.http?.port;
  expect(port, "the AppHost console's fixed port").toBe(3000);
  return `http://localhost:${port}/signin/callback`;
}

/**
 * Environment for this run's console on `port`: the AppHost's sign-in values, this run's cache, stand-in ledger
 * and secrets. No other `CONSOLE_*` value leaks in from the shell; `ui/.env` is left to Next, as under the AppHost.
 */
export function demoConsoleEnv(port: number): NodeJS.ProcessEnv {
  const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('CONSOLE_'))) as NodeJS.ProcessEnv;
  return {
    ...inherited,
    PORT: String(port),
    CONSOLE_PORT: String(port),
    CONSOLE_BASE_URL: `http://127.0.0.1:${port}`,
    ...appHostConsoleSignIn(),
    CONSOLE_API_BASE_URL: FAKE_LEDGER_BASE,
    CONSOLE_REDIS_URL: FAKE_REDIS_URL,
    CONSOLE_REDIS_KEY_PREFIX: CONSOLE_REDIS_KEY_PREFIX,
    CONSOLE_SESSION_SECRET: SESSION_SECRET,
    CONSOLE_TOKEN_ENCRYPTION_KEY: TOKEN_ENCRYPTION_KEY,
  };
}

async function adminToken(): Promise<string> {
  const response = await fetch(`${KEYCLOAK_BASE}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'password', client_id: 'admin-cli', username: ADMIN_LOGIN, password: ADMIN_LOGIN }),
  });
  expect(response.status, 'the Keycloak admin login admin / admin').toBe(200);
  return ((await response.json()) as { access_token: string }).access_token;
}

/**
 * Lets this run's console (on its own port) use the realm's console client, beside the AppHost console's own
 * `http://localhost:3000/signin/callback`, which the realm must already register. The change lives only in the
 * running Keycloak: the AppHost reloads the realm file on its next start.
 */
export async function allowConsoleAddress(consoleBaseUrl: string): Promise<void> {
  const clientId = appHostConsoleSignIn().CONSOLE_ENTRA_CLIENT_ID;
  const headers = { Authorization: `Bearer ${await adminToken()}`, 'Content-Type': 'application/json' };
  const clients = (await (await fetch(`${KEYCLOAK_BASE}/admin/realms/${REALM}/clients?clientId=${encodeURIComponent(clientId)}`, { headers })).json()) as Array<{ id: string; redirectUris?: string[] }>;
  expect(clients, `the demo realm's '${clientId}' client`).toHaveLength(1);
  const client = clients[0];
  expect(client.redirectUris ?? [], "the realm registers the AppHost console's address").toContain(appHostConsoleCallback());
  const updated = await fetch(`${KEYCLOAK_BASE}/admin/realms/${REALM}/clients/${client.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ ...client, redirectUris: [...(client.redirectUris ?? []), `${consoleBaseUrl}/signin/callback`] }),
  });
  expect(updated.status).toBe(204);
}

function isListening(port: number): Promise<boolean> {
  return new Promise((resolvePort) => {
    const socket = connect({ port, host: 'localhost' }, () => {
      socket.end();
      resolvePort(true);
    });
    socket.on('error', () => {
      socket.destroy();
      resolvePort(false);
    });
  });
}

export interface AppHostRun {
  process: ChildProcess;
  output: string;
}

/** Starts the AppHost and waits until its Keycloak serves the demo realm. */
export async function startAppHost(): Promise<AppHostRun> {
  const [name, keycloak] = keycloakResource();
  expect(keycloak.bindings?.http?.port, `the Keycloak resource '${name}' publishes http on the fixed port`).toBe(KEYCLOAK_PORT);
  expect(await isListening(KEYCLOAK_PORT), `port ${KEYCLOAK_PORT} is already in use — stop the other AppHost first`).toBe(false);

  const child = spawn('dotnet', ['run', '--project', APPHOST_PROJECT], { cwd: APPHOST_DIR, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  const run: AppHostRun = { process: child, output: '' };
  child.stdout?.on('data', (chunk) => (run.output += String(chunk)));
  child.stderr?.on('data', (chunk) => (run.output += String(chunk)));

  const deadline = Date.now() + START_TIMEOUT_MS;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`the AppHost exited (${child.exitCode}) before Keycloak served the demo realm:\n${run.output}`);
    try {
      if ((await fetch(`${REALM_ISSUER}/.well-known/openid-configuration`)).ok) return run;
    } catch {
      // Keycloak is not listening yet.
    }
    if (Date.now() > deadline) {
      await stopAppHost(run);
      throw new Error(`Keycloak did not serve the demo realm within ${START_TIMEOUT_MS}ms:\n${run.output}`);
    }
    await new Promise((wait) => setTimeout(wait, 2_000));
  }
}

/** Ctrl-C, as a developer stops it: the AppHost removes the containers it started. */
export async function stopAppHost(run: AppHostRun): Promise<void> {
  const { process: child } = run;
  if (child.exitCode === null && child.pid !== undefined) {
    const exited = new Promise<boolean>((done) => {
      const timer = setTimeout(() => done(false), STOP_TIMEOUT_MS);
      child.once('exit', () => {
        clearTimeout(timer);
        done(true);
      });
    });
    process.kill(-child.pid, 'SIGINT');
    if (!(await exited)) process.kill(-child.pid, 'SIGKILL');
  }
  const deadline = Date.now() + STOP_TIMEOUT_MS;
  while ((await isListening(KEYCLOAK_PORT)) && Date.now() < deadline) await new Promise((wait) => setTimeout(wait, 1_000));
}
