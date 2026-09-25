/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: The main path works end to end on the real stack
 *     Given the repository's stack runs the service, database, cache and console built from this checkout, with a stand-in for Microsoft Entra ID
 *     And the ledger holds the account ACME-000123 with a balance of 100.00 SGD
 *     When Mai signs in, finds ACME-000123 from the Overview search, records a credit of 25.00 SGD and reverses it with the reason "entered twice"
 *     Then ACME-000123 shows a balance of 100.00 SGD
 *     And its statement shows the credit marked reversed and the reversal carrying "entered twice"
 *
 * The stack is the run's own (`support/stack.ts`); the service checks every permission. The
 * account is set up through the console as Mai, before she opens Overview. RED today: the
 * end-to-end runner does not start a stack.
 */
import { expect, test } from '@playwright/test';
import { searchFor } from '../support/overview';
import { confirmMovement, fillRecordForm } from '../support/records';
import { signInAs } from '../support/sign-in';
import { MAI, e2eStack, holdAccountAt } from './support/stack';

test('The main path works end to end on the real stack', async ({ page }) => {
  const stack = e2eStack();
  await signInAs(page, { consoleBaseUrl: stack.consoleBaseUrl, email: MAI });
  await holdAccountAt(page, stack, 'ACME-000123', '100.00');

  await page.goto(`${stack.consoleBaseUrl}/`);
  await searchFor(page, 'ACME-000123');
  const found = page.getByRole('main').locator('tbody tr');
  await expect(found).toHaveCount(1);
  await found.first().getByRole('link', { name: 'ACME-000123', exact: true }).click();

  await expect(page).toHaveURL(`${stack.consoleBaseUrl}/accounts/ACME-000123`);
  const balance = page.getByTestId('account-balance');
  await expect(balance).toHaveText(/^Balance\s*100\.00$/);

  await page.getByRole('button', { name: 'Record posting', exact: true }).click();
  await expect(page.getByLabel('Posting currency', { exact: true })).toHaveValue('SGD');
  await fillRecordForm(page, { direction: 'Credit', amount: '25.00' });
  await confirmMovement(page);
  await expect(balance).toHaveText(/^Balance\s*125\.00$/);

  const statement = page.getByTestId('postings-panel');
  const credit = statement.locator('tbody tr').filter({ hasText: /\+25\.00/ });
  await credit.click();
  await page.getByRole('button', { name: 'Reverse', exact: true }).click();
  await page.getByLabel('Reason', { exact: true }).fill('entered twice');
  await confirmMovement(page);

  await expect(balance).toHaveText(/^Balance\s*100\.00$/);
  await expect(credit.getByText('Reversed', { exact: true })).toBeVisible();
  const reversal = statement.locator('tbody tr').filter({ hasText: /−25\.00/ });
  await expect(reversal).toHaveCount(1);
  await expect(reversal.getByRole('cell').nth(2)).toHaveText('entered twice');
});
