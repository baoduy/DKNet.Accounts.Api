/**
 * DRK-1696 §5:
 *   Scenario: A refusal naming a field is marked on that field
 *     Given the operator Mai is editing the account ACME-000123
 *     When she gives it a name of 250 characters
 *     Then she sees the service's own wording on the name field
 *     And she sees no refusal code
 *
 * Slice note: the field-marking behaviour already exists and is unit-tested
 * (`lib/api/refusal.ts` + `RefusalAlert.tsx`) — this proves the new form binds it, not that
 * it works. RED today: no `/accounts/{account}` route exists yet.
 */
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('A refusal naming a field is marked on that field', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    { accountNumber: 'ACME-000123', currency: 'SGD', decimalPlaces: 2, balance: '100.00', availableBalance: '100.00', heldAmount: '0.00', permittedToGoNegative: false },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });

  await page.goto(`${baseURL}/accounts/ACME-000123`);
  await page.getByLabel('Name').fill('a'.repeat(250));
  await page.getByRole('button', { name: 'Save' }).click();

  const nameField = page.getByLabel('Name');
  await expect(nameField).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Name must be at most 200 characters.')).toBeVisible();
  // Scoped to the edit form that owns the Name field — `<main>` alone is not enough, since
  // the detail screen also draws the account's currency code ("SGD") in its balance tiles.
  const editForm = page.locator('form', { has: page.getByLabel('Name') });
  await expect(editForm.getByText(/^[A-Z_]+$/)).not.toBeVisible();
});
