/**
 * DRK-1796 §5:
 *   @integration
 *   Scenario Outline: The console offers only the actions a demo user's scopes allow
 *     Given AppHost is running
 *     And "<user>" is signed in to the console
 *     When "<user>" opens the 100.00 SGD posting on account "OPS-001"
 *     Then reversing the posting is shown as <reverse>
 *     And opening a new account is shown as <open account>
 *
 *     Examples:
 *       | user     | reverse     | open account |
 *       | admin    | allowed     | allowed      |
 *       | operator | not allowed | allowed      |
 *       | viewer   | not allowed | not allowed  |
 *
 * Each demo user's password equals the user name (§3). The console reads what a user may do from the token the
 * demo realm issued; the ledger behind it is this run's stand-in, holding OPS-001 and its 100.00 SGD credit.
 * "Allowed" is the action on screen and enabled, "not allowed" on screen and disabled (DRK-1696 §5).
 */
import { type Locator } from '@playwright/test';
import { seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { ACME_ID, account, daysAgo, posting } from '../support/records';
import { expect, signInThroughKeycloak, test } from './support/test';

const EXAMPLES = [
  { user: 'admin', reverse: 'allowed', openAccount: 'allowed' },
  { user: 'operator', reverse: 'not allowed', openAccount: 'allowed' },
  { user: 'viewer', reverse: 'not allowed', openAccount: 'not allowed' },
] as const;

async function expectShownAs(action: Locator, shown: 'allowed' | 'not allowed'): Promise<void> {
  await expect(action).toBeVisible();
  if (shown === 'allowed') await expect(action).toBeEnabled();
  else await expect(action).toBeDisabled();
}

for (const { user, reverse, openAccount } of EXAMPLES) {
  test(`The console offers only the actions a demo user's scopes allow — ${user}`, async ({ page, demoConsole }) => {
    await seedLedgerAccounts([account('OPS-001', ACME_ID, { balance: '100.00', availableBalance: '100.00' })]);
    await seedLedgerPostings([
      posting({ id: 'b0000000-0000-4000-8000-000000000001', postingNumber: 'PST0000000001', accountId: ACME_ID, direction: 'Credit', amount: '100.00', currency: 'SGD', category: 'Transfer', effectiveDate: daysAgo(1) }),
    ]);
    await demoConsole.start(undefined);
    await signInThroughKeycloak(page, demoConsole.baseUrl, user, user);

    await page.goto(`${demoConsole.baseUrl}/accounts/OPS-001`);
    await page.getByTestId('postings-panel').getByText('PST0000000001').click();
    await expectShownAs(page.getByRole('main').getByRole('button', { name: 'Reverse', exact: true }), reverse);

    await page.goto(`${demoConsole.baseUrl}/accounts`);
    await expectShownAs(page.getByRole('main').getByRole('button', { name: 'Open account', exact: true }), openAccount);
  });
}
