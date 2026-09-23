import { test as base, expect } from '@playwright/test';
import { resetLedger } from './ledger';
import { resetConsoleRedis } from './redis';

/**
 * DRK-1684 rework round 2 — `scripts/reset-console-redis-reporter.ts` and `scripts/reset-
 * fake-ledger-reporter.ts` reset from `Reporter.onTestBegin`, which Playwright's own type
 * declares `(test: TestCase, result: TestResult): void` (`playwright/types/testReporter.d.ts`)
 * — never `Promise<void>`, so the runner never awaits it. Both reporters' async bodies race
 * the test they meant to isolate: measured as 18 sign-ins' worth of leftover keys (36
 * predicted, 38 measured) by the time spec `38` runs.
 *
 * A fixture is part of the test's own lifecycle instead of the reporter's: Playwright awaits
 * an auto fixture's setup before calling the test body, so the reset is provably complete
 * before the test's first line runs. `10`, `11` and `38` — the only specs asserting the exact
 * keyspace rather than a scoped lookup — import `test`/`expect` from here instead of
 * `@playwright/test` directly; every other spec is unaffected.
 */
export const test = base.extend<{ isolatedTestState: void }>({
  isolatedTestState: [
    // Playwright inspects this function's source for its fixture names, so the first
    // parameter must stay a literal (if empty) destructuring pattern — not renamed, not typed
    // away — even though nothing here needs another fixture.
    async ({}, use) => {
      await resetConsoleRedis();
      await resetLedger();
      await use();
    },
    { auto: true },
  ],
});

export { expect };
