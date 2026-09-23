import { defineConfig } from '@playwright/test';
import { DEFAULT_CONSOLE_BASE, DEFAULT_CONSOLE_PORT, FAKE_OIDC_PORT, FAKE_REDIS_PORT, defaultConsoleEnv } from './tests/support/fixtures';

export default defineConfig({
  testDir: './tests/acceptance',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['./scripts/reset-console-redis-reporter.ts']],
  use: {
    baseURL: DEFAULT_CONSOLE_BASE,
    trace: 'retain-on-failure',
    actionTimeout: 8_000,
    navigationTimeout: 8_000,
  },
  webServer: [
    {
      command: `docker run --rm -p ${FAKE_REDIS_PORT}:6379 --name drk1673-fake-redis redis:8-alpine`,
      port: FAKE_REDIS_PORT,
      timeout: 60_000,
      reuseExistingServer: true,
    },
    {
      command: 'pnpm exec tsx tests/fakes/fake-oidc-issuer.ts',
      port: FAKE_OIDC_PORT,
      timeout: 30_000,
      reuseExistingServer: true,
      env: { FAKE_OIDC_PORT: String(FAKE_OIDC_PORT) },
    },
    {
      command: `pnpm exec next dev -p ${DEFAULT_CONSOLE_PORT}`,
      port: DEFAULT_CONSOLE_PORT,
      timeout: 60_000,
      // Never adopt a stray leftover process from an earlier run — always start (and
      // own) a fresh one, so a mid-run crash surfaces as a clear webServer failure
      // instead of a silent ERR_CONNECTION_REFUSED partway through the suite.
      reuseExistingServer: false,
      env: defaultConsoleEnv(DEFAULT_CONSOLE_PORT) as Record<string, string>,
    },
  ],
});
