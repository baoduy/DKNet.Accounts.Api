/**
 * DRK-1669 §5:
 *   Scenario: An expired token is never served from the cache
 *     Given Mai signed in an hour ago and her access token has since expired
 *     When the console looks in the cache for Mai's token
 *     Then the cache holds no token for Mai
 *     And the console sends no expired token to the ledger service
 */
import { CONSOLE_REDIS_KEY_PREFIX, MAI } from '../support/fixtures';
import { connectTestRedis } from '../support/redis';
import { signInAs } from '../support/sign-in';
import { expect, test } from '../support/test';

const CANARY_ACCESS_TOKEN = 'MAI-CANARY-ACCESS-TOKEN-11-EXPIRED-DO-NOT-SEND';

test('An expired token is never served from the cache', async ({ page, baseURL }) => {
  // A 1-second-lived token stands in for "signed in an hour ago, since expired" — the
  // cache entry's TTL is pinned to the token's own `exp` (R7), so it evicts itself.
  await signInAs(page, {
    consoleBaseUrl: baseURL!,
    email: MAI.email,
    expiresInOverride: 1,
    accessTokenOverride: CANARY_ACCESS_TOKEN,
  });

  const redis = connectTestRedis();
  try {
    // The token is cached before it expires — a non-empty read here is what makes the
    // post-expiry "gone" check below meaningful rather than vacuous.
    const keys = await redis.keys(`${CONSOLE_REDIS_KEY_PREFIX}*token*`);
    expect(keys.length).toBeGreaterThan(0);

    await new Promise((resolve) => setTimeout(resolve, 2_000));

    for (const key of keys) {
      expect(await redis.get(key)).toBeNull();
    }

    // The console sends no expired token to the ledger service: watch every outbound
    // request the console makes while serving Mai a page after her token has expired,
    // and confirm none of them carry the (now-expired) canary token anywhere.
    const requestsCarryingToken: string[] = [];
    page.on('request', (request) => {
      const headers = request.headers();
      const body = request.postData() ?? '';
      if (Object.values(headers).some((v) => v.includes(CANARY_ACCESS_TOKEN)) || body.includes(CANARY_ACCESS_TOKEN)) {
        requestsCarryingToken.push(request.url());
      }
    });
    await page.goto(`${baseURL}/`);
    expect(requestsCarryingToken).toEqual([]);
  } finally {
    await redis.quit();
  }
});
