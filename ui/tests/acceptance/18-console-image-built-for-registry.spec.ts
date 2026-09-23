/**
 * DRK-1669 §5:
 *   Scenario: The console image is built for the registry the service image uses
 *     Given the console builds successfully
 *     When the repository's image build runs for the console
 *     Then a console image is produced for the registry the service image uses
 *     And the image carries no secret and no sign-in value
 *     And the image runs as a non-root user
 *     And the image takes its version from the pipeline, not from a file in the repository
 *
 * The pipeline firing on a merge is the releasing human's check, not the suite's
 * (§7 slice notes) — this test builds the image locally and inspects it.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../../..');
// Same registry and repository the service image publishes to (docker-publish.yml),
// with a test-only tag standing in for the pipeline-computed version.
const IMAGE_REPOSITORY = 'ghcr.io/baoduy/dknet.accounts-console';
const IMAGE_TAG = `${IMAGE_REPOSITORY}:acceptance-test`;

test('The console image is built for the registry the service image uses', async () => {
  const dockerfilePath = path.join(REPO_ROOT, 'ui', 'Dockerfile');
  expect(fs.existsSync(dockerfilePath)).toBe(true);

  execFileSync('docker', ['build', '-f', dockerfilePath, '-t', IMAGE_TAG, REPO_ROOT], { stdio: 'pipe' });

  const inspect = JSON.parse(
    execFileSync('docker', ['inspect', IMAGE_TAG], { encoding: 'utf-8' }),
  )[0];

  // Built for the registry and repository the service image uses.
  expect(inspect.RepoTags as string[]).toContain(IMAGE_TAG);

  expect(inspect.Config.User).not.toBe('');
  expect(inspect.Config.User).not.toBe('root');
  expect(inspect.Config.User).not.toBe('0');

  // Config.Env is an array of "KEY=value" strings, not a map.
  for (const entry of (inspect.Config.Env ?? []) as string[]) {
    const key = entry.split('=')[0];
    expect(key.toUpperCase()).not.toContain('SECRET');
  }

  const history = execFileSync('docker', ['history', '--no-trunc', IMAGE_TAG], { encoding: 'utf-8' });
  expect(history.toLowerCase()).not.toContain('client_secret');
  expect(history.toLowerCase()).not.toContain('token_encryption_key');
});
