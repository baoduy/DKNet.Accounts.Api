/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: Published images and the sample settings trust only Microsoft Entra ID
 *     Given the service and console images built for the registry, and the sample environment file
 *     When their sign-in settings are read
 *     Then none of them names or trusts the stand-in sign-in server
 *
 * What names the stand-in is read from the one place allowed to (brief DRK-1730 §4): the
 * end-to-end check's own `docker-compose.e2e.yml` — the services it adds (the stand-in) and the
 * hosts its sign-in settings point the service and the console at. Those must be there, and
 * none of them, nor any setting that relaxes the service's trust (brief §3 row 5), may appear in
 * what is published or shipped as a default:
 *
 * - the console image, built from `ui/Dockerfile` for the registry the pipeline pushes it to;
 * - the service image, which the pipeline builds from the service's project file
 *   (`docker-publish.yml`: `dotnet publish /t:PublishContainer`), carrying its `appsettings*.json`,
 *   and the local `Dockerfile` `docker-compose.yml` builds it from;
 * - `.env.sample`, and `docker-compose.yml` as written and as resolved on its own.
 *
 * RED today: `docker-compose.e2e.yml` does not exist.
 *
 * DRK-1796 §5:
 *   @integration
 *   Scenario: Published artefacts never name the demo sign-in server
 *     Given the service and console images built for the registry, the sample environment file and the repository's container stack
 *     When their sign-in settings are read
 *     Then none of them names Keycloak, the demo realm or its secrets
 *     And none of them relaxes how tokens are trusted
 *
 * What names the AppHost's demo sign-in server is read from the one place allowed to (DRK-1796 R5): the AppHost's
 * own Keycloak wiring (`AppHost.cs`, its Keycloak resource) and the realm file it imports (`Realms/`) — the realm's
 * name and its own clients' ids and secrets, Keycloak's built-in clients left out. Those markers are matched as
 * whole names (`dknet-accounts-api:local`, a compose image name, does not name a realm `dknet-accounts`); the
 * stand-in's markers keep matching anywhere in the text. RELAXED_TRUST already covers "relaxes how tokens are
 * trusted". RED for DRK-1796: the AppHost has no Keycloak resource and no realm file.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { expect, test } from '../support/test';
import { RUN_ID } from '../support/fixtures';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../../..');
const SERVICE_DIR = path.join(REPO_ROOT, 'ApiEndpoints', 'DKNet.Accounts.Api');
const CONSOLE_IMAGE = `ghcr.io/baoduy/dknet.accounts-console:acceptance-trust-${RUN_ID}`;

/** Settings that loosen how the service or the console checks who signed a token. */
const RELAXED_TRUST = ['RequireHttpsMetadata', 'MapInboundClaims', 'NODE_EXTRA_CA_CERTS', 'SSL_CERT_FILE'];

const APPHOST_DIR = path.join(REPO_ROOT, 'ApiEndpoints', 'DKNet.Accounts.AppHost');

/** The clients every Keycloak realm is created with — they name nothing of the demo realm's own. */
const KEYCLOAK_BUILT_IN_CLIENTS = new Set(['account', 'account-console', 'admin-cli', 'broker', 'realm-management', 'security-admin-console']);

type RealmFile = { realm?: string; clients?: Array<{ clientId?: string; secret?: string }> };

/** DRK-1796: what names the demo sign-in server — Keycloak, the AppHost's Keycloak resource, the realm and its secrets. */
function demoSignInMarkers(): string[] {
  const keycloakResource = /\.AddKeycloak\(\s*"([^"]+)"/.exec(read(APPHOST_DIR, 'AppHost.cs'))?.[1];
  expect(keycloakResource, "the AppHost's Keycloak resource").toBeTruthy();

  const realmsDir = path.join(APPHOST_DIR, 'Realms');
  const realmFiles = fs.existsSync(realmsDir) ? fs.readdirSync(realmsDir).filter((name) => name.endsWith('.json')) : [];
  expect(realmFiles.length, 'realm files the AppHost imports').toBeGreaterThan(0);
  const realms = realmFiles.map((name) => JSON.parse(read(realmsDir, name)) as RealmFile);

  const own = realms.flatMap((realm) => (realm.clients ?? []).filter((client) => !KEYCLOAK_BUILT_IN_CLIENTS.has(client.clientId ?? '')));
  expect(own.length, "the demo realm's own clients").toBeGreaterThan(0);
  return [
    ...new Set(
      ['keycloak', keycloakResource!, ...realms.map((realm) => realm.realm ?? ''), ...own.flatMap((client) => [client.clientId ?? '', client.secret ?? ''])].filter(Boolean),
    ),
  ];
}

/** `marker` as a whole name: not inside a longer name of letters, digits and dashes. */
function namesWhole(text: string, marker: string): boolean {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![A-Za-z0-9-])${escaped}(?![A-Za-z0-9-])`, 'i').test(text);
}

type ComposeFile = { services?: Record<string, { environment?: Record<string, unknown> | string[] }> };

function read(...parts: string[]): string {
  return fs.readFileSync(path.join(...parts), 'utf8');
}

function environment(file: ComposeFile, service: string): Record<string, string> {
  const env = file.services?.[service]?.environment ?? {};
  if (Array.isArray(env)) return Object.fromEntries(env.map((entry) => [entry.split('=')[0], entry.slice(entry.indexOf('=') + 1)]));
  return Object.fromEntries(Object.entries(env).map(([key, value]) => [key, String(value ?? '')]));
}

function hosts(values: string[]): string[] {
  return values.flatMap((value) => [...value.matchAll(/https?:\/\/([A-Za-z0-9.-]+)/g)].map((match) => match[1]));
}

test.afterAll(() => {
  try {
    execFileSync('docker', ['image', 'rm', CONSOLE_IMAGE], { stdio: 'ignore' });
  } catch {
    // Never built — the check failed before its build finished.
  }
});

test('Published images and the sample settings trust only Microsoft Entra ID', async () => {
  test.setTimeout(15 * 60_000);

  const e2ePath = path.join(REPO_ROOT, 'docker-compose.e2e.yml');
  expect(fs.existsSync(e2ePath), 'docker-compose.e2e.yml').toBe(true);
  const base = parse(read(REPO_ROOT, 'docker-compose.yml')) as ComposeFile;
  const e2e = parse(read(e2ePath)) as ComposeFile;

  const standIns = Object.keys(e2e.services ?? {}).filter((service) => !(service in (base.services ?? {})));
  expect(standIns.length, 'services docker-compose.e2e.yml adds').toBeGreaterThan(0);

  const serviceTrust = environment(e2e, 'api');
  const consoleTrust = environment(e2e, 'console');
  expect(Object.keys(serviceTrust).filter((key) => key.startsWith('Authentication__Schemes__Bearer__')).length, 'the service trusts the stand-in').toBeGreaterThan(0);
  expect(Object.keys(consoleTrust), 'the console signs in through the stand-in').toContain('CONSOLE_ENTRA_ISSUER_BASE_URL');

  const baseHosts = new Set(Object.keys(base.services ?? {}));
  const standInHosts = hosts([...Object.values(serviceTrust), ...Object.values(consoleTrust)]).filter((host) => !baseHosts.has(host));
  expect(standInHosts.length, 'hosts the check points sign-in at').toBeGreaterThan(0);
  const markers = [...new Set([...standIns, ...standInHosts, ...RELAXED_TRUST])];
  const demoMarkers = demoSignInMarkers();

  execFileSync('docker', ['build', '-f', path.join(REPO_ROOT, 'ui', 'Dockerfile'), '-t', CONSOLE_IMAGE, REPO_ROOT], { stdio: 'pipe' });
  const consoleImage = JSON.parse(execFileSync('docker', ['inspect', CONSOLE_IMAGE], { encoding: 'utf8' }))[0].Config as Record<string, unknown>;

  const published: Record<string, string> = {
    '.env.sample': read(REPO_ROOT, '.env.sample'),
    'docker-compose.yml': read(REPO_ROOT, 'docker-compose.yml'),
    'docker-compose.yml resolved': execFileSync('docker', ['compose', '-f', 'docker-compose.yml', '--profile', 'api', '--profile', 'console', 'config'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }),
    'ui/Dockerfile': read(REPO_ROOT, 'ui', 'Dockerfile'),
    'console image settings': JSON.stringify({ env: consoleImage.Env, labels: consoleImage.Labels, entrypoint: consoleImage.Entrypoint, cmd: consoleImage.Cmd }),
    'console image history': execFileSync('docker', ['history', '--no-trunc', CONSOLE_IMAGE], { encoding: 'utf8' }),
    'service project file': read(SERVICE_DIR, 'DKNet.Accounts.Api.csproj'),
    'service Dockerfile': read(SERVICE_DIR, 'Dockerfile'),
    ...Object.fromEntries(
      fs
        .readdirSync(SERVICE_DIR)
        .filter((name) => /^appsettings.*\.json$/.test(name))
        .map((name) => [`service ${name}`, read(SERVICE_DIR, name)]),
    ),
  };

  const named = Object.entries(published).flatMap(([where, text]) => [
    ...markers.filter((marker) => text.toLowerCase().includes(marker.toLowerCase())).map((marker) => `${where} names ${marker}`),
    ...demoMarkers.filter((marker) => namesWhole(text, marker)).map((marker) => `${where} names ${marker}`),
  ]);
  expect(named).toEqual([]);
});
