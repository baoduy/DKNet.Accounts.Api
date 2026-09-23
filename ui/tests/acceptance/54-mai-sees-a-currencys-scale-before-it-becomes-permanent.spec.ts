/**
 * DRK-1695 §5:
 *   Scenario: Mai sees a currency's scale before it becomes permanent
 *     Given no currency uses the code "VND"
 *     When Mai enters the code "VND", the name "Vietnamese Dong", and 0 decimal places
 *     Then the form shows 1,250 VND as the worked example
 *     And after she registers it the list shows "VND", "Vietnamese Dong", 0 decimal places and status active
 *     And its code and its decimal places are read-only from then on
 *
 * Drives `/currencies`. RED today: `CurrenciesScreen` is a stub that throws (row 12).
 *
 * UI contract this AT fixes for Build: the create form shows a live worked example at
 * `data-testid="currency-worked-example"`, computed from the in-progress `Decimal places`
 * field before the currency is saved.
 */
import { expect, test } from '@playwright/test';
import { MAI } from '../support/fixtures';
import { signInAs } from '../support/sign-in';

test("Mai sees a currency's scale before it becomes permanent", async ({ page, baseURL }) => {
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/currencies`);

  await page.getByRole('button', { name: 'New currency' }).click();
  await page.getByLabel('Code').fill('VND');
  await page.getByLabel('Name').fill('Vietnamese Dong');
  await page.getByLabel('Decimal places').fill('0');

  await expect(page.getByTestId('currency-worked-example')).toHaveText('1,250 VND');

  await page.getByRole('button', { name: 'Register currency' }).click();

  await expect(page.getByRole('row', { name: /VND/ })).toBeVisible();
  const row = page.getByRole('row', { name: /VND/ });
  await expect(row.getByText('Vietnamese Dong')).toBeVisible();
  await expect(row.getByText('Active')).toBeVisible();

  await row.click();
  await page.getByRole('button', { name: 'Edit currency' }).click();
  await expect(page.getByLabel('Code')).toBeDisabled();
  await expect(page.getByLabel('Decimal places')).toBeDisabled();
});
