import { defineConfig } from '@playwright/test';
import { FAKE_LEDGER_PORT, FAKE_REDIS_CONTAINER, FAKE_REDIS_PORT } from './tests/support/fixtures';

// DRK-1796 — `pnpm run test:apphost`. The checks run the real AppHost (it needs the .NET SDK and Docker) and sign
// in through the Keycloak it starts; the console each check drives uses this run's own cache and stand-in ledger.
export default defineConfig({
  testDir: './tests/apphost',
  timeout: 5 * 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  globalSetup: './tests/apphost/support/global-setup.ts',
  use: {
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    // A route's first visit includes its `next dev` compile.
    navigationTimeout: 60_000,
  },
  webServer: [
    {
      command: `docker run --rm -p 127.0.0.1:${FAKE_REDIS_PORT}:6379 --name ${FAKE_REDIS_CONTAINER} redis:8-alpine`,
      port: FAKE_REDIS_PORT,
      timeout: 60_000,
      reuseExistingServer: false,
    },
    {
      command: 'pnpm exec tsx tests/fakes/fake-ledger-service.ts',
      port: FAKE_LEDGER_PORT,
      timeout: 30_000,
      reuseExistingServer: false,
      env: { FAKE_LEDGER_PORT: String(FAKE_LEDGER_PORT) },
    },
  ],
});
