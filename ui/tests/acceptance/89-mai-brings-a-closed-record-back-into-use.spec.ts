/**
 * DRK-1695 §5:
 *   Scenario Outline: Mai brings a closed record back into use
 *     Given <record> is <closed state> and holds no balance
 *     When Mai reopens it
 *     Then it is active again
 *
 *     Examples:
 *       | record             | closed state |
 *       | group "SUSP"       | closed       |
 *       | currency "VND"     | deactivated  |
 *
 * Drives `/groups` and `/currencies`. RED today: both screens are stubs that throw (rows
 * 11-12).
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedAccountGroups, seedCurrencies } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('Mai reopens a closed group', async ({ page, baseURL }) => {
  await seedAccountGroups([{ code: 'SUSP', name: 'Suspense', ownerId: 'default-owner', status: 'Closed' }]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/groups`);

  await page.getByRole('row', { name: /SUSP/ }).click();
  await page.getByRole('button', { name: 'Reopen group' }).click();

  await expect(page.getByTestId('detail-panel').getByText('Active')).toBeVisible();
});

// DRK-1745: rewrite for the new form
test.fixme('Mai reactivates a deactivated currency', async ({ page, baseURL }) => {
  await seedCurrencies([{ code: 'VND', name: 'Vietnamese Dong', decimalPlaces: 0, isActive: false }]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/currencies`);

  await page.getByRole('row', { name: /VND/ }).click();
  await page.getByRole('button', { name: 'Activate currency' }).click();

  await expect(page.getByTestId('detail-panel').getByText('Active')).toBeVisible();
});
