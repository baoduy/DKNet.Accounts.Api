/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario Outline: An action the operator has no permission for stays on screen
 *     Given the operator Mai holds the read permissions but not the <permission> permission
 *     When she opens the Records screen and the posting P-10042
 *     Then she sees <action> on screen and disabled
 *     And she reads that it needs the <permission> permission
 *
 *     Examples:
 *       | permission | action         |
 *       | record     | Record posting |
 *       | reverse    | Reverse        |
 *
 * `record` is `postings.write`, `reverse` is `postings.reverse` (§3a, `ScopeGate`'s caption).
 * `MAI` holds the reads and `postings.reverse` but not `postings.write`;
 * `MAI_MISSING_REVERSE_SCOPE` holds the reads only. Scoped to the screen content: the user
 * menu's own missing-scope badge is a separate surface. RED today: no `/records` route exists.
 */
import { expect, test } from '../support/test';
import { MAI, MAI_MISSING_REVERSE_SCOPE } from '../support/fixtures';
import { seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { GLOBEX_ID, account, daysAgo, posting, recordRow } from '../support/records';
import { signInAs } from '../support/sign-in';

const EXAMPLES = [
  { permission: 'record', user: MAI, action: 'Record posting', scope: 'postings.write' },
  { permission: 'reverse', user: MAI_MISSING_REVERSE_SCOPE, action: 'Reverse', scope: 'postings.reverse' },
];

for (const { permission, user, action, scope } of EXAMPLES) {
  test(`An action the operator has no permission for stays on screen — ${permission}`, async ({ page, baseURL }) => {
    await seedLedgerAccounts([account('GLOBEX-000456', GLOBEX_ID)]);
    await seedLedgerPostings([
      posting({ id: 'b0000000-0000-4000-8000-000000010042', postingNumber: 'P-10042', accountId: GLOBEX_ID, direction: 'Credit', amount: '30.00', currency: 'SGD', category: 'Transfer', effectiveDate: daysAgo(1) }),
    ]);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: user.email });

    await page.goto(`${baseURL}/records`);
    await recordRow(page, 'P-10042').click();

    const main = page.getByRole('main');
    const button = main.getByRole('button', { name: action, exact: true });
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
    await expect(main.getByText(`requires ${scope}`, { exact: true })).toBeVisible();
  });
}
