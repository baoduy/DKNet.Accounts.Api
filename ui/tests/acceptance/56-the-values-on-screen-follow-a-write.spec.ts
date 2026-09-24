/**
 * DRK-1696 §5:
 *   Scenario: The values on screen follow a write
 *     Given the operator Mai has the detail screen of the account ACME-000123 open at 12,400.00 SGD
 *     When she records a credit of 500.00 SGD
 *     Then she sees 12,900.00 SGD before she can record another
 *
 * "Before she can act again" — an ordering assertion, not just an eventual refresh: the
 * record control must be usable again only once the refreshed balance is on screen.
 * RED today: no `/accounts/{account}` route exists yet.
 *
 * dev-leader AT review round 1, finding 3: asserting the refreshed balance and an enabled
 * control after the fact does not prove ordering — the control could have stayed enabled
 * the whole time. The `POST /api/ledger/postings` response is held open so the in-flight
 * state is observable: the control must be disabled and the balance still 12,400.00 while
 * the write is pending, only becoming available once the refreshed 12,900.00 is on screen.
 */
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('The values on screen follow a write', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    { accountNumber: 'ACME-000123', currency: 'SGD', decimalPlaces: 2, balance: '12400.00', availableBalance: '12400.00', heldAmount: '0.00', permittedToGoNegative: false },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });

  let releaseResponse: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route('**/api/ledger/postings', async (route) => {
    await held;
    await route.continue();
  });

  await page.goto(`${baseURL}/accounts/ACME-000123`);
  await page.getByRole('button', { name: 'Record posting' }).click();
  await page.getByLabel('Direction', { exact: true }).selectOption('Credit');
  await page.getByLabel('Amount', { exact: true }).fill('500.00');
  await page.getByLabel('Category', { exact: true }).selectOption('Transfer');
  await page.getByRole('button', { name: 'Record' }).click();
  // DRK-1713 §3 row 10 — recording is confirmed before anything is sent.
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();

  // While the write is still in flight: the control is unavailable and the balance unchanged.
  await expect(page.getByRole('button', { name: 'Record posting' })).toBeDisabled();
  await expect(page.getByTestId('account-balance')).toContainText('12,400.00');

  releaseResponse();

  // Only once the refreshed balance is on screen does the control become usable again.
  await expect(page.getByTestId('account-balance')).toContainText('12,900.00');
  await expect(page.getByRole('button', { name: 'Record posting' })).toBeEnabled();
});
