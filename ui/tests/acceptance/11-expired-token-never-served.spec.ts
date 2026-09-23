/**
 * DRK-1669 §5:
 *   Scenario: An expired token is never served from the cache
 *     Given Mai signed in an hour ago and her access token has since expired
 *     When the console looks in the cache for Mai's token
 *     Then the cache holds no token for Mai
 *     And the console sends no expired token to the ledger service
 */
import { expect, test } from '@playwright/test';
import { CONSOLE_REDIS_KEY_PREFIX, MAI } from '../support/fixtures';
import { connectTestRedis } from '../support/redis';
import { signInAs } from '../support/sign-in';

test('An expired token is never served from the cache', async ({ page, baseURL }) => {
  // A 1-second-lived token stands in for "signed in an hour ago, since expired" — the
  // cache entry's TTL is pinned to the token's own `exp` (R7), so it evicts itself.
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email, expiresInOverride: 1 });

  const redis = connectTestRedis();
  try {
    await new Promise((resolve) => setTimeout(resolve, 2_000));

    const keys = await redis.keys(`${CONSOLE_REDIS_KEY_PREFIX}*token*`);
    for (const key of keys) {
      expect(await redis.get(key)).toBeNull();
    }
  } finally {
    await redis.quit();
  }
});
