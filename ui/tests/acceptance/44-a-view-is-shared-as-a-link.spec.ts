/**
 * DRK-1696 §5:
 *   Scenario: A view is shared as a link
 *     Given the operator Mai filters the accounts list to SGD, sorts by name and opens page 2
 *     When she copies the page address and opens it again
 *     Then she sees the same filter, the same sort and the same page
 *
 * RED today: no `/accounts` route exists yet.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('A view is shared as a link', async ({ page, baseURL }) => {
  await seedLedgerAccounts(
    Array.from({ length: 3 }, (_, index) => ({
      accountNumber: `ACME-${String(index + 1).padStart(6, '0')}`,
      name: `Account ${index + 1}`,
      currency: 'SGD',
      decimalPlaces: 2,
      balance: '100.00',
      availableBalance: '100.00',
      heldAmount: '0.00',
      permittedToGoNegative: false,
    })),
  );
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  await page.goto(`${baseURL}/accounts`);
  await page.getByLabel('Currency filter').selectOption('SGD');
  await page.getByRole('columnheader', { name: 'Name' }).click();
  await page.getByRole('button', { name: 'Page 2' }).click();

  const sharedUrl = page.url();
  await page.goto(sharedUrl);

  await expect(page.getByLabel('Currency filter')).toHaveValue('SGD');
  await expect(page.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
  const params = new URL(sharedUrl).searchParams;
  expect(params.get('sort')).toBe('name');
  expect(params.get('page')).toBe('2');
});
