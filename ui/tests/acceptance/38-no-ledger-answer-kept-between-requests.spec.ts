/**
 * DRK-1679 §5:
 *   Scenario: No ledger answer is kept on the console's own side between requests
 *     Given the operator Mai has read the account ACME-000123
 *     When the console's server-side storage is read
 *     Then it holds her session and her encrypted access token only
 *     And it holds no account, posting or balance
 *
 * DRK-1679 §7 slice note: this only discriminates if it enumerates the *real* Redis
 * keyspace under `CONSOLE_REDIS_KEY_PREFIX` after a read, not just the two keys expected —
 * so the first assertion below proves the read actually happened (row 5 is a stub today,
 * so it has not), before the Redis-shape assertion, which would otherwise hold trivially
 * even with nothing implemented and prove nothing.
 */
import { CONSOLE_REDIS_KEY_PREFIX, MAI } from '../support/fixtures';
import { connectTestRedis } from '../support/redis';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';
import { expect, test } from '../support/test';

test("No ledger answer is kept on the console's own side between requests", async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    {
      accountNumber: 'ACME-000123',
      currency: 'SGD',
      decimalPlaces: 2,
      balance: '12400.00',
      availableBalance: '12400.00',
      heldAmount: '0.00',
      permittedToGoNegative: false,
      minimumBalance: '0.00',
    },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  const response = await page.request.get(`${baseURL}/api/ledger/accounts/ACME-000123/balance`);
  expect(response.status()).toBe(200); // proves the read happened — RED today, row 5 is a stub

  const redis = connectTestRedis();
  try {
    const keys = await redis.keys(`${CONSOLE_REDIS_KEY_PREFIX}*`);
    expect(keys.length).toBe(2);
    for (const key of keys) {
      const value = ((await redis.get(key)) ?? '').toLowerCase();
      expect(value).not.toContain('balance');
      expect(value).not.toContain('acme-000123');
    }
  } finally {
    await redis.quit();
  }
});
