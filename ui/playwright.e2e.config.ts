import { defineConfig } from '@playwright/test';

// DRK-1725 §3 "The end-to-end check" — `pnpm run test:e2e`. The global setup starts this run's
// own stack and publishes it to the checks (`tests/e2e/support/stack.ts`), and removes it when
// the run ends.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  globalSetup: './tests/e2e/support/global-setup.ts',
  use: {
    trace: 'retain-on-failure',
    // The stand-in sign-in server is `https://fake-oidc:<port>` to the console and the service
    // inside the stack; the browser reaches the same address on the port the stack publishes on
    // 127.0.0.1. Its certificate comes from the run's own CA, which only the stack trusts.
    ignoreHTTPSErrors: true,
    launchOptions: { args: ['--host-resolver-rules=MAP fake-oidc 127.0.0.1'] },
  },
});
