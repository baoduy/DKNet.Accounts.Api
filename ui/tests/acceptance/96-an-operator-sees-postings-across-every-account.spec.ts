/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario: An operator sees postings across every account
 *     Given the ledger holds a credit of 100.00 SGD on ACME-000123 and a credit of 50.00 SGD on GLOBEX-000456, both effective this week
 *     When the operator Mai opens the Records screen
 *     Then she sees both postings in one list, the most recently recorded first
 *
 * The GLOBEX posting is written first but recorded earlier, so the service's own default order
 * (the order written) is the reverse of "most recently recorded first" — only a screen that
 * asks for recency shows ACME first. RED today: no `/records` route exists.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { ledgerRequests, seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { ACME_ID, GLOBEX_ID, account, cellText, daysAgo, posting, recordRows } from '../support/records';
import { signInAs } from '../support/sign-in';

// DRK-1745: rewrite for the new form
test.fixme('An operator sees postings across every account', async ({ page, baseURL }) => {
  await seedLedgerAccounts([account('ACME-000123', ACME_ID), account('GLOBEX-000456', GLOBEX_ID)]);
  await seedLedgerPostings([
    posting({ id: 'b0000000-0000-4000-8000-000000010050', postingNumber: 'P-10050', accountId: GLOBEX_ID, direction: 'Credit', amount: '50.00', currency: 'SGD', category: 'Transfer', effectiveDate: daysAgo(2), recordedAt: `${daysAgo(2)}T09:00:00.000Z` }),
    posting({ id: 'b0000000-0000-4000-8000-000000010042', postingNumber: 'P-10042', accountId: ACME_ID, direction: 'Credit', amount: '100.00', currency: 'SGD', category: 'Transfer', effectiveDate: daysAgo(1), recordedAt: `${daysAgo(1)}T09:00:00.000Z` }),
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  await page.goto(`${baseURL}/records`);

  const rows = recordRows(page);
  await expect(rows).toHaveCount(2);
  expect(await cellText(page, rows.nth(0), 'Account')).toBe('ACME-000123');
  expect(await cellText(page, rows.nth(0), 'Amount')).toBe('100.00');
  expect(await cellText(page, rows.nth(1), 'Account')).toBe('GLOBEX-000456');
  expect(await cellText(page, rows.nth(1), 'Amount')).toBe('50.00');

  // One list across every account: the request names no account.
  const list = (await ledgerRequests()).filter((r) => r.method === 'GET' && r.path.startsWith('/v1/postings?')).at(-1)!;
  expect(new URLSearchParams(list.path.split('?')[1]).has('accountId')).toBe(false);
});
