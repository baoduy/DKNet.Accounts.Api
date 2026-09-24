import Redis from 'ioredis';
import type { Reporter, TestCase } from '@playwright/test/reporter';
import { CONSOLE_REDIS_KEY_PREFIX, FAKE_REDIS_URL } from '../tests/support/fixtures';

/**
 * The fake Redis container is one long-lived `webServer` for the whole acceptance run
 * (so repeated local runs don't pay container-startup cost), but several scenarios
 * (10, 11) assert the *entire* count of keys under the console's prefix — which only
 * holds if this test's own sign-in is the only thing that has ever written to it.
 * Clearing the console's own keys before each test gives every scenario the isolation
 * it assumes, without touching the frozen spec/support files.
 */
export default class ResetConsoleRedisReporter implements Reporter {
  async onTestBegin(_test: TestCase): Promise<void> {
    const redis = new Redis(FAKE_REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 2 });
    try {
      const keys = await redis.keys(`${CONSOLE_REDIS_KEY_PREFIX}*`);
      if (keys.length) await redis.del(...keys);
    } catch {
      // The fake Redis webServer may not be listening yet for the very first test.
    } finally {
      await redis.quit();
    }
  }
}
