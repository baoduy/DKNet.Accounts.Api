/**
 * DRK-1696 §5:
 *   Scenario: An action the operator has no permission for stays on screen
 *     Given the operator Mai holds the read permissions but not the reverse permission
 *     When she opens a posting on the account ACME-000123
 *     Then she sees the reverse action on screen and disabled
 *     And she sees that it needs the reverse permission
 *
 * RED today: no `/accounts/{account}` route exists yet.
 */
import { expect, test } from '@playwright/test';
import { MAI_MISSING_REVERSE_SCOPE } from '../support/fixtures';
import { seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('An action the operator has no permission for stays on screen', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    { accountNumber: 'ACME-000123', currency: 'SGD', decimalPlaces: 2, balance: '100.00', availableBalance: '100.00', heldAmount: '0.00', permittedToGoNegative: false },
  ]);
  await seedLedgerPostings([
    { id: 'p1', postingNumber: 'PST0000000001', accountId: 'ACME-000123', streamPosition: 1, direction: 'Credit', amount: '100.00', signedAmount: '100.00', balanceAfter: '100.00', currency: 'SGD', category: 'Transfer' },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_MISSING_REVERSE_SCOPE.email });

  await page.goto(`${baseURL}/accounts/ACME-000123`);
  await page.getByTestId('postings-panel').getByText('PST0000000001').click();

  const reverseButton = page.getByRole('button', { name: /reverse/i });
  await expect(reverseButton).toBeVisible();
  await expect(reverseButton).toBeDisabled();
  // Scoped to the screen content — the user menu's own missing-scope badge is a separate surface.
  await expect(page.getByRole('main').getByText(/postings\.reverse/)).toBeVisible();
});
