/**
 * DRK-1696 §5:
 *   Scenario Outline: The posting list narrows on what the service accepts
 *     Given the account ACME-000123 has postings of every direction, category and status
 *     When the operator Mai narrows the list by <dimension>
 *     Then the service accepts the request
 *     And she sees only the matching postings
 *
 *     Examples: direction | category | status
 *
 * RED today: no `/accounts/{account}` route exists yet.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { signInAs } from '../support/sign-in';

const POSTINGS = [
  { id: 'p1', postingNumber: 'PST0000000001', accountId: 'ACME-000123', streamPosition: 1, direction: 'Credit' as const, amount: '10.00', signedAmount: '10.00', balanceAfter: '10.00', currency: 'SGD', category: 'Transfer', status: 'Posted' as const },
  { id: 'p2', postingNumber: 'PST0000000002', accountId: 'ACME-000123', streamPosition: 2, direction: 'Debit' as const, amount: '5.00', signedAmount: '-5.00', balanceAfter: '5.00', currency: 'SGD', category: 'Fee', status: 'Posted' as const },
  { id: 'p3', postingNumber: 'PST0000000003', accountId: 'ACME-000123', streamPosition: 3, direction: 'Credit' as const, amount: '20.00', signedAmount: '20.00', balanceAfter: '25.00', currency: 'SGD', category: 'Adjustment', status: 'Reversed' as const },
];

const CASES: Array<{ dimension: string; label: string; value: string; visible: string[]; hidden: string[] }> = [
  { dimension: 'direction', label: 'Direction filter', value: 'Debit', visible: ['PST0000000002'], hidden: ['PST0000000001', 'PST0000000003'] },
  { dimension: 'category', label: 'Category filter', value: 'Fee', visible: ['PST0000000002'], hidden: ['PST0000000001', 'PST0000000003'] },
  { dimension: 'status', label: 'Status filter', value: 'Reversed', visible: ['PST0000000003'], hidden: ['PST0000000001', 'PST0000000002'] },
];

for (const { dimension, label, value, visible, hidden } of CASES) {
  // DRK-1745: rewrite for the new form
  test.fixme(`The posting list narrows on what the service accepts — ${dimension}`, async ({ page, baseURL }) => {
    await seedLedgerAccounts([
      { accountNumber: 'ACME-000123', currency: 'SGD', decimalPlaces: 2, balance: '25.00', availableBalance: '25.00', heldAmount: '0.00', permittedToGoNegative: false },
    ]);
    await seedLedgerPostings(POSTINGS);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

    await page.goto(`${baseURL}/accounts/ACME-000123`);
    const panel = page.getByTestId('postings-panel');
    await page.getByLabel(label).selectOption(value);

    for (const postingNumber of visible) await expect(panel.getByText(postingNumber)).toBeVisible();
    for (const postingNumber of hidden) await expect(panel.getByText(postingNumber)).not.toBeVisible();
  });
}
