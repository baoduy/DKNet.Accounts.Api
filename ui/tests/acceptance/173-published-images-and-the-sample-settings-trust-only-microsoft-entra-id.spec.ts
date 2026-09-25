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

  const named = Object.entries(published).flatMap(([where, text]) =>
    markers.filter((marker) => text.toLowerCase().includes(marker.toLowerCase())).map((marker) => `${where} names ${marker}`),
  );
  expect(named).toEqual([]);
});
