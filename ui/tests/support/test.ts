import { test as base, expect } from '@playwright/test';
import { resetLedger } from './ledger';
import { resetPostingSequence } from './records';
import { resetConsoleRedis } from './redis';
import { standInStopped, stoppedStandIn } from './stand-ins';

async function expectStandInsRunning(): Promise<void> {
  const stopped = await stoppedStandIn();
  if (stopped) throw new Error(standInStopped(stopped));
}

/**
 * Every acceptance check imports `test`/`expect` from here (DRK-1726 R4). The auto fixture is
 * part of each check's own lifecycle: Playwright awaits its setup before the check's first line
 * and its teardown before the next check starts, so
 *
 * - every check starts from an empty cache keyspace, an empty fake ledger and a fresh posting
 *   sequence, whatever the check before it left behind;
 * - a stand-in that stopped (R3) fails the check that was running when it stopped, by name,
 *   and no later check's body runs — `global-setup.ts` stops the run itself.
 */
export const test = base.extend<{ isolatedTestState: void }>({
  isolatedTestState: [
    // Playwright inspects this function's source for its fixture names, so the first
    // parameter must stay a literal (if empty) destructuring pattern — not renamed, not typed
    // away — even though nothing here needs another fixture.
    async ({}, use) => {
      await expectStandInsRunning();
      await resetConsoleRedis();
      await resetLedger();
      resetPostingSequence();
      await use();
      await expectStandInsRunning();
    },
    { auto: true },
  ],
});

export { expect };
