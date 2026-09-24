import { defineConfig } from '@playwright/test';

// DRK-1725 §3 "The end-to-end check" — `pnpm run test:e2e`. The global setup starts this run's
// own stack and publishes it to the checks (`tests/e2e/support/stack.ts`).
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
  },
});
