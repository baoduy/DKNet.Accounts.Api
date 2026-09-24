/**
 * Shared test fixtures for the acceptance-test harness. These values are the harness's
 * own test data — not the spec's literals — except where a comment says otherwise. Ports and
 * names are this run's own (`run.ts`).
 */
import { currentRun } from './run';

const RUN = currentRun();

/** This run's own id — names what the run creates outside this process (container, image tag). */
export const RUN_ID = RUN.id;

export const FAKE_OIDC_PORT = RUN.signInPort;
export const FAKE_OIDC_BASE = `http://127.0.0.1:${FAKE_OIDC_PORT}`;

export const FAKE_REDIS_PORT = RUN.cachePort;
export const FAKE_REDIS_URL = `redis://127.0.0.1:${FAKE_REDIS_PORT}`;
export const FAKE_REDIS_CONTAINER = `console-acceptance-cache-${RUN_ID}`;

/** DRK-1684 §3 row 15 — the fake standing in for the ledger service itself. */
export const FAKE_LEDGER_PORT = RUN.ledgerPort;
export const FAKE_LEDGER_BASE = `http://127.0.0.1:${FAKE_LEDGER_PORT}`;

export const DEFAULT_CONSOLE_PORT = RUN.consolePort;
export const DEFAULT_CONSOLE_BASE = `http://127.0.0.1:${DEFAULT_CONSOLE_PORT}`;

/** The console specs 08, 15, 16 and 17 start, restart and stop themselves. */
export const OWN_CONSOLE_PORT = RUN.ownConsolePort;

export const TENANT_DRUNK_CODING = 'drunk-coding-tenant';
export const TENANT_OTHER_DIRECTORY = 'other-directory-tenant';

export const CLIENT_ID = 'console-test-client';
export const CLIENT_SECRET = 'console-test-secret';

export const CONSOLE_REDIS_KEY_PREFIX = 'console:';
export const TOKEN_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef'; // 32 bytes, AES-256
export const SESSION_SECRET = 'test-session-signing-secret';

export interface FixtureUser {
  email: string;
  name: string;
  objectId: string;
  tenantId: string;
  tenantName: string;
  scopes: string[];
}

/**
 * DRK-1669 §5 Scenario "The identity menu states the provider..." grants the first three;
 * `accounts.write` (DRK-1697 §3a) is what lets Mai create, close, reopen and delete account
 * groups and currencies.
 */
export const MAI: FixtureUser = {
  email: 'mai@drunkcoding.net',
  name: 'Mai Nguyen',
  objectId: '11111111-1111-4111-8111-111111111111',
  tenantId: TENANT_DRUNK_CODING,
  tenantName: 'Drunk Coding',
  scopes: ['accounts.read', 'accounts.write', 'postings.read', 'postings.reverse'],
};

/** Same operator, a token missing `postings.reverse` — DRK-1669 §5 identity-menu scenario.
 * Its own address (DRK-1696 §3 row 11): sharing `mai@drunkcoding.net` with `MAI`/`MAI_WITH_WRITE`
 * would leave whichever of the three grants the issuer's fixture last for that address, not
 * the scopes below. */
export const MAI_MISSING_REVERSE_SCOPE: FixtureUser = {
  ...MAI,
  email: 'mai-partial@drunkcoding.net',
  scopes: ['accounts.read', 'postings.read'],
};

/** Same operator, granted `accounts.write` and `postings.write` too — DRK-1696 §5: opening,
 * editing and recording. Its own address, for the same reason as `MAI_MISSING_REVERSE_SCOPE`. */
export const MAI_WITH_WRITE: FixtureUser = {
  ...MAI,
  email: 'mai-write@drunkcoding.net',
  scopes: ['accounts.read', 'accounts.write', 'postings.read', 'postings.write', 'postings.reverse'],
};

export const NAM: FixtureUser = {
  email: 'nam@drunkcoding.net',
  name: 'Nam Tran',
  objectId: '22222222-2222-4222-8222-222222222222',
  tenantId: TENANT_DRUNK_CODING,
  tenantName: 'Drunk Coding',
  scopes: ['accounts.read'],
};

/** The console-wide known scope set (DRK-1669 §9 Q2 default) — all 5 the service defines (DRK-1684 §3 row 11/12). */
export const KNOWN_SCOPES = ['accounts.read', 'accounts.write', 'postings.read', 'postings.write', 'postings.reverse'];

/** Console env shared by every scenario that does not need its own dedicated process. */
export function defaultConsoleEnv(port: number = DEFAULT_CONSOLE_PORT): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PORT: String(port),
    CONSOLE_PORT: String(port),
    CONSOLE_BASE_URL: `http://127.0.0.1:${port}`,
    CONSOLE_ENTRA_TENANT_ID: TENANT_DRUNK_CODING,
    CONSOLE_ENTRA_CLIENT_ID: CLIENT_ID,
    CONSOLE_ENTRA_CLIENT_SECRET: CLIENT_SECRET,
    CONSOLE_ENTRA_SCOPES: KNOWN_SCOPES.join(' '),
    CONSOLE_ENTRA_ISSUER_BASE_URL: FAKE_OIDC_BASE,
    CONSOLE_API_BASE_URL: FAKE_LEDGER_BASE,
    CONSOLE_REDIS_URL: FAKE_REDIS_URL,
    CONSOLE_REDIS_KEY_PREFIX: CONSOLE_REDIS_KEY_PREFIX,
    CONSOLE_SESSION_SECRET: SESSION_SECRET,
    CONSOLE_TOKEN_ENCRYPTION_KEY: TOKEN_ENCRYPTION_KEY,
  };
}
