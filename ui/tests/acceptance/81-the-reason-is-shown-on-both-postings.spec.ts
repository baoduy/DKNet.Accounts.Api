/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario Outline: The reason is shown on both postings
 *     Given P-10077 reversed P-10042 with the reason "duplicate of the morning batch"
 *     When the operator Mai opens <posting>
 *     Then she reads "<link>" and the reason "duplicate of the morning batch"
 *
 *     Examples:
 *       | posting | link                  |
 *       | P-10042 | Reversed by P-10077   |
 *       | P-10077 | Reverses P-10042      |
 *
 * The service stores the reason once, as the reversal's description; the original only links
 * to it (§2). Each posting is opened with the other one outside the listed period, so the
 * screen must follow the link through the newly declared `GET /postings/{id}` (brief §3 row 1)
 * rather than find it on the page it already has.
 *
 * Plus stage 2 rule R4 (brief §6), which this cycle's widened route must keep: an address
 * whose `{id}` carries its own path separator is refused by the pass-through, and nothing
 * reaches the ledger service. RED today: no `/records` route exists (the R4 test is a guard:
 * it holds today and must still hold once `GET /postings/{id}` is declared).
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { ledgerRequests, seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { GLOBEX_ID, account, posting, recordRow, recordRows, setPeriod } from '../support/records';
import { signInAs } from '../support/sign-in';

const P_10042 = 'b0000000-0000-4000-8000-000000010042';
const P_10077 = 'b0000000-0000-4000-8000-000000010077';

const EXAMPLES = [
  { opened: 'P-10042', period: ['2026-08-01', '2026-08-31'], link: 'Reversed by P-10077', followed: P_10077 },
  { opened: 'P-10077', period: ['2026-09-01', '2026-09-30'], link: 'Reverses P-10042', followed: P_10042 },
];

for (const { opened, period, link, followed } of EXAMPLES) {
  test(`The reason is shown on both postings — ${opened}`, async ({ page, baseURL }) => {
    await seedLedgerAccounts([account('GLOBEX-000456', GLOBEX_ID)]);
    await seedLedgerPostings([
      posting({ id: P_10042, postingNumber: 'P-10042', accountId: GLOBEX_ID, direction: 'Credit', amount: '30.00', currency: 'SGD', category: 'Transfer', effectiveDate: '2026-08-10', status: 'Reversed', reversedByPostingId: P_10077 }),
      posting({ id: P_10077, postingNumber: 'P-10077', accountId: GLOBEX_ID, direction: 'Debit', amount: '30.00', currency: 'SGD', category: 'Reversal', description: 'duplicate of the morning batch', effectiveDate: '2026-09-20', reversesPostingId: P_10042 }),
    ]);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
    await page.goto(`${baseURL}/records`);
    await setPeriod(page, period[0], period[1]);
    await expect(recordRows(page)).toHaveCount(1);

    await recordRow(page, opened).click();

    const panel = page.getByTestId('detail-panel');
    await expect(panel).toContainText(link);
    await expect(panel).toContainText('duplicate of the morning batch');
    const readOne = (await ledgerRequests()).filter((r) => r.method === 'GET' && r.path === `/v1/postings/${followed}`);
    expect(readOne.length).toBeGreaterThanOrEqual(1);
  });
}

test('R4 — a posting address carrying its own path separator is refused, and nothing reaches the ledger', async ({ page, baseURL }) => {
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  for (const address of ['postings/..%2F..%2Fadmin', 'postings/..%5C..%5Cadmin']) {
    const response = await page.request.get(`${baseURL}/api/ledger/${address}`);
    expect(response.status(), address).toBe(404);
    const body = (await response.json()) as { errors: Array<{ message: string }> };
    expect(body.errors[0].message).toMatch(/^The console's contract does not declare GET \//);
  }

  expect((await ledgerRequests()).filter((r) => r.path.includes('admin'))).toHaveLength(0);
});
