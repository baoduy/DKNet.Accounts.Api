/**
 * DRK-1669 §5:
 *   Scenario: The stored token is unreadable to anyone holding the cache data
 *     Given Mai has signed in
 *     When the console's cache records are read directly
 *     Then no usable access token is found
 */
import { expect, test } from '@playwright/test';
import { CONSOLE_REDIS_KEY_PREFIX, MAI } from '../support/fixtures';
import { connectTestRedis } from '../support/redis';
import { signInAs } from '../support/sign-in';

const CANARY_ACCESS_TOKEN = 'MAI-CANARY-ACCESS-TOKEN-09-DO-NOT-STORE-PLAINTEXT';

test('The stored token is unreadable to anyone holding the cache data', async ({ page, baseURL }) => {
  await signInAs(page, {
    consoleBaseUrl: baseURL!,
    email: MAI.email,
    accessTokenOverride: CANARY_ACCESS_TOKEN,
  });

  const redis = connectTestRedis();
  try {
    const keys = await redis.keys(`${CONSOLE_REDIS_KEY_PREFIX}*token*`);
    expect(keys.length).toBeGreaterThan(0);

    for (const key of keys) {
      const value = await redis.get(key);
      expect(value ?? '').not.toContain(CANARY_ACCESS_TOKEN);
    }
  } finally {
    await redis.quit();
  }
});
