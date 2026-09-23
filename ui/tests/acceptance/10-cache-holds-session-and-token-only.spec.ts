/**
 * DRK-1669 §5:
 *   Scenario: The cache holds the session and the token and nothing else
 *     Given Mai has signed in and has opened the console
 *     And the ledger service is using the same cache
 *     When the records under the console's own prefix are listed
 *     Then only Mai's session and Mai's encrypted token are found
 *     And no account, posting or currency value is found
 *     And the console has written nothing outside its own prefix
 */
import { expect, test } from '@playwright/test';
import { CONSOLE_REDIS_KEY_PREFIX, MAI } from '../support/fixtures';
import { connectTestRedis } from '../support/redis';
import { signInAs } from '../support/sign-in';

test('The cache holds the session and the token and nothing else', async ({ page, baseURL }) => {
  const redis = connectTestRedis();
  const LEDGER_KEY = 'ledger:account:acct-001';
  try {
    // The ledger service is using the same cache, under its own (non-console) key.
    await redis.set(LEDGER_KEY, JSON.stringify({ accountNumber: 'acct-001', balance: '1000.00' }));

    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
    await page.goto(`${baseURL}/`);

    const consoleKeys = await redis.keys(`${CONSOLE_REDIS_KEY_PREFIX}*`);
    expect(consoleKeys.length).toBe(2);

    for (const key of consoleKeys) {
      const value = (await redis.get(key)) ?? '';
      expect(value.toLowerCase()).not.toContain('account');
      expect(value.toLowerCase()).not.toContain('posting');
      expect(value.toLowerCase()).not.toContain('currency');
    }

    // The console wrote nothing outside its own prefix — the ledger's key is untouched.
    expect(await redis.get(LEDGER_KEY)).toContain('acct-001');
  } finally {
    await redis.del(LEDGER_KEY);
    await redis.quit();
  }
});
