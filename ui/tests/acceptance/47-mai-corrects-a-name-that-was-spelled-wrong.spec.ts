/**
 * DRK-1695 §5:
 *   Scenario Outline: Mai corrects a name that was spelled wrong
 *     Given <record> is named <wrong name>
 *     When Mai corrects the name to <right name>
 *     Then <record> is named <right name>
 *     And its <locked fields> are unchanged
 *
 *     Examples:
 *       | record         | wrong name        | right name          | locked fields           |
 *       | group "TRSY"   | "Tresury"         | "Treasury"          | code and owner          |
 *       | currency "SGD" | "Singapore Dolar" | "Singapore Dollar"  | code and decimal places |
 *
 * Drives `/groups` and `/currencies`. RED today: both screens are stubs that throw (rows
 * 11-12).
 */
import { expect, test } from '@playwright/test';
import { MAI } from '../support/fixtures';
import { seedAccountGroups, seedCurrencies } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('Mai corrects a group name that was spelled wrong', async ({ page, baseURL }) => {
  await seedAccountGroups([{ code: 'TRSY', name: 'Tresury', ownerId: 'partner-bank-01' }]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/groups`);

  await page.getByRole('row', { name: /TRSY/ }).click();
  await page.getByRole('button', { name: 'Edit group' }).click();
  await page.getByLabel('Name').fill('Treasury');
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByTestId('detail-panel').getByText('Treasury')).toBeVisible();
  await expect(page.getByTestId('detail-panel').getByText('TRSY')).toBeVisible();
  await expect(page.getByTestId('detail-panel').getByText('partner-bank-01')).toBeVisible();
});

test('Mai corrects a currency name that was spelled wrong', async ({ page, baseURL }) => {
  await seedCurrencies([{ code: 'SGD', name: 'Singapore Dolar', decimalPlaces: 2 }]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/currencies`);

  await page.getByRole('row', { name: /SGD/ }).click();
  await page.getByRole('button', { name: 'Edit currency' }).click();
  await page.getByLabel('Name').fill('Singapore Dollar');
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByTestId('detail-panel').getByText('Singapore Dollar')).toBeVisible();
  await expect(page.getByTestId('detail-panel').getByText('SGD')).toBeVisible();
  await expect(page.getByTestId('detail-panel').getByText('2')).toBeVisible();
});
