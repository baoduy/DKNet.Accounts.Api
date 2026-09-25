/**
 * DRK-1707 §6 (brief DRK-1708 §6-§7; the spec carries no Gherkin, so each scenario is its rule):
 *
 *   Scenario: R1 — a named API image is pulled from its registry and never built
 *     Given API_IMAGE names an image
 *     When the developer starts the repository's container stack
 *     Then the api service runs exactly that image, fetched from its registry, and is never built
 *
 *   Scenario: R2 — with no API image named, the API is built from the checked-out source
 *     Given API_IMAGE is blank
 *     When the developer starts the repository's container stack
 *     Then the api service is built from ApiEndpoints/DKNet.Accounts.Api/Dockerfile and never pulled
 *
 *   Scenario: R3 — the console image follows the same rule with ui/Dockerfile
 *
 *   Scenario: R4 — with the console switched off, the stack serves a console run on the host
 *     Given the console is switched off
 *     When the developer starts the repository's container stack
 *     Then postgres, redis and api start, and nothing else
 *     And the API is published on API_PORT
 *
 *   Scenario: R5 — with the API side switched off, the console runs against the configured API
 *     Given the API side is switched off and the console's API address is configured
 *     When the developer starts the repository's container stack
 *     Then redis and console start, and nothing else
 *     And the console reaches the API at the configured address
 *
 *   Scenario: R6 — the unmodified sample environment starts both services, built from source
 *     Given a developer has copied .env.sample to .env unmodified
 *     When the developer starts the repository's container stack
 *     Then postgres, redis, api and console start, api and console built from source
 *
 * The observation point is the compose model `docker compose config --format json` resolves
 * for a controlled environment (§2 test seam), not `docker compose up`: the real build is the
 * Build run's check (§8). Two compose facts the assertions rest on (compose v2):
 *   - a service that has a `build` section is built whenever its pull fails, whatever its
 *     pull_policy, so "never built" means the resolved service has no `build` at all;
 *   - a buildable service with the default pull_policy is pulled first, so "never pulled"
 *     means pull_policy `build`.
 *
 * The switch is compose profiles (`api`, `console`) selected by COMPOSE_PROFILES (brief §9 Q1
 * default); the console's in-stack API address is the compose-level value CONSOLE_API_ADDRESS.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '../support/test';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../../..');

type ComposeService = {
  image?: string;
  build?: { context: string; dockerfile: string };
  pull_policy?: string;
  environment?: Record<string, string>;
  ports?: { target: number; published?: string }[];
};

/**
 * Resolves the root compose file against exactly `envFile` — `--env-file` replaces the
 * checkout's own `.env`, and the process environment is stripped to what docker itself
 * needs, so neither a developer's `.env` nor an exported API_IMAGE leaks into the result.
 */
function resolveCompose(envFileContent: string): Record<string, ComposeService> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'drk1707-compose-'));
  const envFile = path.join(dir, 'compose.env');
  fs.writeFileSync(envFile, envFileContent);
  const env: Record<string, string> = {};
  for (const key of ['PATH', 'HOME', 'DOCKER_HOST', 'DOCKER_CONFIG', 'DOCKER_CONTEXT', 'XDG_RUNTIME_DIR']) {
    if (process.env[key] !== undefined) env[key] = process.env[key]!;
  }
  try {
    const json = execFileSync(
      'docker',
      ['compose', '-f', 'docker-compose.yml', '--env-file', envFile, 'config', '--format', 'json'],
      { cwd: REPO_ROOT, env: env as NodeJS.ProcessEnv, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return JSON.parse(json).services;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function expectPulledNeverBuilt(service: ComposeService, image: string) {
  expect(service.image).toBe(image);
  expect(service.build).toBeUndefined();
  expect(service.pull_policy).not.toBe('never');
  expect(service.pull_policy).not.toBe('build');
}

function expectBuiltNeverPulled(service: ComposeService, dockerfile: string) {
  expect(service.build).toBeDefined();
  expect(service.build!.context).toBe(REPO_ROOT);
  expect(path.resolve(service.build!.context, service.build!.dockerfile)).toBe(path.join(REPO_ROOT, dockerfile));
  expect(fs.existsSync(path.join(REPO_ROOT, dockerfile))).toBe(true);
  expect(service.pull_policy).toBe('build');
  // Built under a local tag: no registry host in front of the repository name.
  expect(service.image).toBeDefined();
  expect(service.image).not.toMatch(/^[^/]*[.:][^/]*\//);
}

const API_DOCKERFILE = 'ApiEndpoints/DKNet.Accounts.Api/Dockerfile';
const CONSOLE_DOCKERFILE = 'ui/Dockerfile';

test('R1 — a named API image is pulled from its registry and never built', async () => {
  const services = resolveCompose(
    ['COMPOSE_PROFILES=api,console', 'API_IMAGE=registry.example.com/team/accounts-api:1.2.3', ''].join('\n'),
  );
  expectPulledNeverBuilt(services.api, 'registry.example.com/team/accounts-api:1.2.3');
});

test('R2 — with no API image named, the API is built from the checked-out source and never pulled', async () => {
  const services = resolveCompose(['COMPOSE_PROFILES=api,console', 'API_IMAGE=', ''].join('\n'));
  expectBuiltNeverPulled(services.api, API_DOCKERFILE);
});

test('R3 — the console image is pulled when named and built from ui/Dockerfile when not', async () => {
  await test.step('CONSOLE_IMAGE set: pulled, never built', async () => {
    const services = resolveCompose(
      ['COMPOSE_PROFILES=api,console', 'CONSOLE_IMAGE=registry.example.com/team/accounts-console:4.5.6', ''].join('\n'),
    );
    expectPulledNeverBuilt(services.console, 'registry.example.com/team/accounts-console:4.5.6');
  });
  await test.step('CONSOLE_IMAGE blank: built from ui/Dockerfile, never pulled', async () => {
    const services = resolveCompose(['COMPOSE_PROFILES=api,console', 'CONSOLE_IMAGE=', ''].join('\n'));
    expectBuiltNeverPulled(services.console, CONSOLE_DOCKERFILE);
  });
});

test('R4 — with the console switched off, the stack runs the API, its database and Redis for a console on the host', async () => {
  const services = resolveCompose(['COMPOSE_PROFILES=api', 'API_PORT=18080', ''].join('\n'));
  expect(Object.keys(services).sort()).toEqual(['api', 'postgres', 'redis']);
  expect(services.api.ports).toEqual([expect.objectContaining({ target: 8080, published: '18080' })]);
});

test('R5 — with the API side switched off, the stack runs the console and Redis against the configured API address', async () => {
  const services = resolveCompose(
    ['COMPOSE_PROFILES=console', 'CONSOLE_API_ADDRESS=https://accounts-api.example.com', ''].join('\n'),
  );
  expect(Object.keys(services).sort()).toEqual(['console', 'redis']);
  expect(services.console.environment?.CONSOLE_API_BASE_URL).toBe('https://accounts-api.example.com');
});

test('R6 — the unmodified sample environment starts both services, built from source', async () => {
  const services = resolveCompose(fs.readFileSync(path.join(REPO_ROOT, '.env.sample'), 'utf-8'));
  expect(Object.keys(services).sort()).toEqual(['api', 'console', 'postgres', 'redis']);
  expectBuiltNeverPulled(services.api, API_DOCKERFILE);
  expectBuiltNeverPulled(services.console, CONSOLE_DOCKERFILE);
  // The in-stack default, not .env.sample's host-side CONSOLE_API_BASE_URL (localhost:8080).
  expect(services.console.environment?.CONSOLE_API_BASE_URL).toBe('http://api:8080');
});
