/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario Outline: A reversal reason is required and at most 500 characters
 *     Given the operator Mai is reversing the posting P-10042
 *     When she confirms with <reason>
 *     Then <result>
 *
 *     Examples:
 *       | reason                     | result                                                |
 *       | no reason                  | nothing is reversed and the reason control is marked |
 *       | a reason of 501 characters | nothing is reversed and the reason control is marked |
 *       | a reason of 500 characters | P-10042 is reversed                                   |
 *
 * "Nothing is reversed": no reverse request reaches the service, and P-10042 is still posted.
 * The 501-character reason is held by the control as typed (never cut to 500 on entry), so the
 * refusal is the form's. RED today: no `/records` route exists.
 */
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { ledgerPostings, ledgerRequests, seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { GLOBEX_ID, account, confirmMovement, daysAgo, posting, recordRow } from '../support/records';
import { signInAs } from '../support/sign-in';

const P_10042 = 'b0000000-0000-4000-8000-000000010042';

const EXAMPLES = [
  { name: 'no reason', reason: '', reversed: false },
  { name: 'a reason of 501 characters', reason: 'r'.repeat(501), reversed: false },
  { name: 'a reason of 500 characters', reason: 'r'.repeat(500), reversed: true },
];

for (const { name, reason, reversed } of EXAMPLES) {
  test(`A reversal reason is required and at most 500 characters — ${name}`, async ({ page, baseURL }) => {
    await seedLedgerAccounts([account('GLOBEX-000456', GLOBEX_ID)]);
    await seedLedgerPostings([
      posting({ id: P_10042, postingNumber: 'P-10042', accountId: GLOBEX_ID, direction: 'Credit', amount: '30.00', currency: 'SGD', category: 'Transfer', effectiveDate: daysAgo(1) }),
    ]);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });
    await page.goto(`${baseURL}/records`);
    await recordRow(page, 'P-10042').click();
    await page.getByTestId('detail-panel').getByRole('button', { name: 'Reverse', exact: true }).click();

    const reasonControl = page.getByLabel('Reason', { exact: true });
    await reasonControl.fill(reason);
    await expect(reasonControl).toHaveValue(reason);
    await confirmMovement(page);

    const reverseCalls = async (): Promise<number> => (await ledgerRequests()).filter((r) => r.method === 'POST' && r.path.endsWith('/reverse')).length;
    const statusOfP10042 = async (): Promise<string | undefined> => (await ledgerPostings()).find((p) => p.id === P_10042)?.status;
    if (reversed) {
      await expect.poll(statusOfP10042).toBe('Reversed');
      expect(await reverseCalls()).toBe(1);
    } else {
      await expect(reasonControl).toHaveAttribute('aria-invalid', 'true');
      expect(await reverseCalls()).toBe(0);
      expect(await statusOfP10042()).toBe('Posted');
    }
  });
}
