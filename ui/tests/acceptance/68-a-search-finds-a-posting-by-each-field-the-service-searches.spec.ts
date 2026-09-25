/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario Outline: A search finds a posting by each field the service searches
 *     Given the ledger holds P-10042, carrying the counterparty reference INV-2026-0917 and the description "September office rent"
 *     And the ledger holds 4 other postings that carry none of these values
 *     When the operator Mai searches the list for "<term>"
 *     Then she sees only P-10042
 *
 *     Examples:
 *       | term                  |
 *       | P-10042               |
 *       | INV-2026-0917         |
 *       | September office rent |
 *
 * RED today: no `/records` route exists.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { ledgerRequests, seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { ACME_ID, GLOBEX_ID, account, daysAgo, posting, recordRow, recordRows } from '../support/records';
import { signInAs } from '../support/sign-in';

for (const term of ['P-10042', 'INV-2026-0917', 'September office rent']) {
  // DRK-1745: rewrite for the new form
  test.fixme(`A search finds a posting by each field the service searches — ${term}`, async ({ page, baseURL }) => {
    await seedLedgerAccounts([account('ACME-000123', ACME_ID), account('GLOBEX-000456', GLOBEX_ID)]);
    await seedLedgerPostings([
      posting({ id: 'b0000000-0000-4000-8000-000000010042', postingNumber: 'P-10042', accountId: ACME_ID, direction: 'Debit', amount: '4200.00', currency: 'SGD', category: 'Payment', counterpartyReference: 'INV-2026-0917', description: 'September office rent', effectiveDate: daysAgo(1) }),
      ...[1, 2, 3, 4].map((n) =>
        posting({ id: `b0000000-0000-4000-8000-00000002000${n}`, postingNumber: `P-2000${n}`, accountId: n % 2 ? ACME_ID : GLOBEX_ID, direction: 'Credit', amount: `${n}0.00`, currency: 'SGD', category: 'Transfer', counterpartyReference: `REF-${n}`, description: 'Payroll', effectiveDate: daysAgo(1) }),
      ),
    ]);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
    await page.goto(`${baseURL}/records`);
    await expect(recordRows(page)).toHaveCount(5);

    await page.getByLabel('Search postings', { exact: true }).fill(term);

    await expect(recordRows(page)).toHaveCount(1);
    await expect(recordRow(page, 'P-10042')).toHaveCount(1);
    // The service did the searching — the browser never filtered a fetched page itself.
    const searched = (await ledgerRequests()).filter((r) => r.method === 'GET' && r.path.startsWith('/v1/postings?') && new URLSearchParams(r.path.split('?')[1]).get('search') === term);
    expect(searched.length).toBeGreaterThanOrEqual(1);
  });
}
