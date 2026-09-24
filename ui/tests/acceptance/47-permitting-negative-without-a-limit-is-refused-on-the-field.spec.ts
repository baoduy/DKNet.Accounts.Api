/**
 * DRK-1696 §5:
 *   Scenario: Permitting an account to go negative without a limit is refused on the field
 *     Given the account ACME-000123 is not permitted to go negative
 *     When the operator Mai permits it to go negative and leaves the overdraft limit empty
 *     Then she sees the refusal code OVERDRAFT_LIMIT_REQUIRED with the service's own wording
 *     And the refusal is shown against the floor settings
 *
 * The service names no field on OVERDRAFT_LIMIT_REQUIRED (decision log,
 * `2026-09-24 · product-owner · A refusal that names no field is shown against the controls
 * it concerns`) — the console must route it to the floor settings by code, not by field.
 * RED today: no `/accounts/{account}` route exists yet.
 */
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('Permitting an account to go negative without a limit is refused on the field', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    { accountNumber: 'ACME-000123', currency: 'SGD', decimalPlaces: 2, balance: '100.00', availableBalance: '100.00', heldAmount: '0.00', permittedToGoNegative: false },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });

  await page.goto(`${baseURL}/accounts/ACME-000123`);
  await page.getByLabel('Permitted to go negative', { exact: true }).check();
  await page.getByLabel('Overdraft limit', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Save' }).click();

  const floorSettings = page.getByTestId('floor-settings');
  await expect(floorSettings.getByText('OVERDRAFT_LIMIT_REQUIRED')).toBeVisible();
  await expect(floorSettings).toContainText('overdraft limit is required');
});
