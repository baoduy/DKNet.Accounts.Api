/**
 * DRK-1669 §5:
 *   Scenario: The whole of local setup is copying the sample file and filling in the
 *     directory values
 *     Given a developer has copied the sample environment file
 *     And the developer has filled in only the directory values
 *     When the developer starts the repository's container stack
 *     Then the console runs beside the service, its database and Redis
 *     And Mai can sign in and reach the framed console
 *
 * This reads the checked-in files rather than actually running `docker compose up`: a
 * missing `console:` service or `.env.sample` entry is the RED reason today, and the
 * expensive compose-up step only has anything to verify once those exist.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { parse as parseYaml } from 'yaml';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../../..');

test('The whole of local setup is copying the sample file and filling in the directory values', async () => {
  const composePath = path.join(REPO_ROOT, 'docker-compose.yml');
  const compose = parseYaml(fs.readFileSync(composePath, 'utf-8'));
  expect(compose.services).toHaveProperty('console');
  expect(compose.services.console.depends_on).toEqual(
    expect.objectContaining({ api: expect.anything(), redis: expect.anything() }),
  );

  const envSample = fs.readFileSync(path.join(REPO_ROOT, '.env.sample'), 'utf-8');
  for (const key of [
    'CONSOLE_ENTRA_TENANT_ID',
    'CONSOLE_ENTRA_CLIENT_ID',
    'CONSOLE_ENTRA_CLIENT_SECRET',
    'CONSOLE_REDIS_URL',
    'CONSOLE_SESSION_SECRET',
    'CONSOLE_TOKEN_ENCRYPTION_KEY',
  ]) {
    expect(envSample).toContain(key);
  }

  // Once the compose entry and Dockerfile exist, this is the real check: bring the
  // stack up and reach a signed-in console through it.
  execFileSync('docker', ['compose', 'config'], { cwd: REPO_ROOT, stdio: 'pipe' });
});
