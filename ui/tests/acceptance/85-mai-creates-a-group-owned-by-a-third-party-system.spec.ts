/**
 * DRK-1695 §5:
 *   Scenario: Mai creates a group owned by a third-party system
 *     Given no group uses the code "TRSY"
 *     When Mai creates the group "Treasury" with code "TRSY" owned by "partner-bank-01"
 *     Then the group is created and owned by "partner-bank-01"
 *     And its code and its owner are read-only from then on
 *
 * Drives `/groups`. RED today: `AccountGroupsScreen` is a stub that throws (row 11).
 *
 * UI contract this AT fixes for Build: `New group` opens a create form (`Code`, `Name`,
 * `Owner`, `Type`, `Description`); `Create group` submits it; re-opening the created row and
 * clicking `Edit group` shows `Code` and `Owner` as disabled fields (R3).
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { signInAs } from '../support/sign-in';

test('Mai creates a group owned by a third-party system', async ({ page, baseURL }) => {
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/groups`);

  await page.getByRole('button', { name: 'New group' }).click();
  await page.getByLabel('Code').fill('TRSY');
  await page.getByLabel('Name').fill('Treasury');
  await page.getByLabel('Owner').fill('partner-bank-01');
  await page.getByLabel('Type').selectOption('Customer');
  await page.getByRole('button', { name: 'Create group' }).click();

  await expect(page.getByTestId('detail-panel')).toBeVisible();
  await expect(page.getByTestId('detail-panel').getByText('partner-bank-01')).toBeVisible();

  await page.getByRole('button', { name: 'Edit group' }).click();
  await expect(page.getByLabel('Code')).toBeDisabled();
  await expect(page.getByLabel('Owner')).toBeDisabled();
  await expect(page.getByLabel('Code')).toHaveValue('TRSY');
  await expect(page.getByLabel('Owner')).toHaveValue('partner-bank-01');
});
