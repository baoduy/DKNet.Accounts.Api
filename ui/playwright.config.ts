import { defineConfig } from '@playwright/test';
import { DEFAULT_CONSOLE_BASE, DEFAULT_CONSOLE_PORT, FAKE_LEDGER_PORT, FAKE_OIDC_PORT, FAKE_REDIS_CONTAINER, FAKE_REDIS_PORT, defaultConsoleEnv } from './tests/support/fixtures';

export default defineConfig({
  testDir: './tests/acceptance',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  globalSetup: './tests/support/global-setup.ts',
  use: {
    baseURL: DEFAULT_CONSOLE_BASE,
    trace: 'retain-on-failure',
    actionTimeout: 8_000,
    navigationTimeout: 8_000,
  },
  // Every port and name is this run's own (`tests/support/run.ts`), and no stand-in is ever
  // adopted from another run: each is started, owned and stopped by this one (DRK-1726 R1, R2).
  webServer: [
    {
      command: `docker run --rm -p 127.0.0.1:${FAKE_REDIS_PORT}:6379 --name ${FAKE_REDIS_CONTAINER} redis:8-alpine`,
      port: FAKE_REDIS_PORT,
      timeout: 60_000,
      reuseExistingServer: false,
    },
    {
      command: 'pnpm exec tsx tests/fakes/fake-oidc-issuer.ts',
      port: FAKE_OIDC_PORT,
      timeout: 30_000,
      reuseExistingServer: false,
      env: { FAKE_OIDC_PORT: String(FAKE_OIDC_PORT) },
    },
    {
      command: 'pnpm exec tsx tests/fakes/fake-ledger-service.ts',
      port: FAKE_LEDGER_PORT,
      timeout: 30_000,
      reuseExistingServer: false,
      env: { FAKE_LEDGER_PORT: String(FAKE_LEDGER_PORT) },
    },
    {
      command: `pnpm exec next dev -p ${DEFAULT_CONSOLE_PORT}`,
      port: DEFAULT_CONSOLE_PORT,
      timeout: 60_000,
      reuseExistingServer: false,
      env: defaultConsoleEnv(DEFAULT_CONSOLE_PORT) as Record<string, string>,
    },
  ],
});
