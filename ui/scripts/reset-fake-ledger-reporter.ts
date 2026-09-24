import type { Reporter, TestCase } from '@playwright/test/reporter';
import { resetLedger } from '../tests/support/ledger';

/**
 * `fake-ledger-service.ts` is one long-lived `webServer` for the whole acceptance run, so a
 * posting or balance change one scenario makes must not leak into the next. Reset before
 * each test, the same way `reset-console-redis-reporter.ts` isolates Redis.
 */
export default class ResetFakeLedgerReporter implements Reporter {
  async onTestBegin(_test: TestCase): Promise<void> {
    try {
      await resetLedger();
    } catch {
      // The fake ledger webServer may not be listening yet for the very first test.
    }
  }
}
