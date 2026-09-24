/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario Outline: A repeat from the same form counts once until the first attempt succeeds
 *     Given the operator Mai confirmed a credit of 250.00 SGD to ACME-000123 on the Records screen's record form
 *     And <first attempt>
 *     When she confirms a credit of 250.00 SGD to ACME-000123 again from the same form
 *     Then the ledger holds <count> credits of 250.00 SGD on ACME-000123
 *
 *     Examples:
 *       | first attempt                                                           | count |
 *       | the service recorded it, but its answer never reached her               | 1     |
 *       | the service refused it with ACCOUNT_FROZEN, and ACME-000123 was then reactivated | 1     |
 *       | she saw it succeed                                                      | 2     |
 *
 * Spec gate round 2, finding 1: a refused attempt stores nothing, so the ACCOUNT_FROZEN row
 * holds 1 credit whether the key was kept or replaced — each row therefore also asserts the
 * key the second attempt carried (R5: kept after a refusal or no answer, replaced only after a
 * success). The page is never reloaded between attempts: "the same form". RED today: no
 * `/records` route exists.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { dropNextPostingAnswer, ledgerPostings, recordingRequests, seedLedgerAccounts } from '../support/ledger';
import { ACME_ID, account, confirmMovement, fillRecordForm } from '../support/records';
import { signInAs } from '../support/sign-in';

const CREDIT = { accountNumber: 'ACME-000123', direction: 'Credit' as const, amount: '250.00' };

/** "confirms ... again from the same form": the form as the first attempt left it — its
 * confirmation still open, or back to the form to fill and confirm. */
async function confirmAgain(page: Page): Promise<void> {
  if (!(await page.getByRole('dialog').isVisible())) await fillRecordForm(page, CREDIT);
  await confirmMovement(page);
}

async function creditsOnAcme(): Promise<number> {
  return (await ledgerPostings()).filter((p) => p.accountId === ACME_ID && p.direction === 'Credit' && p.amount === '250.00').length;
}

test.describe('A repeat from the same form counts once until the first attempt succeeds', () => {
  test('the service recorded it, but its answer never reached her', async ({ page, baseURL }) => {
    await seedLedgerAccounts([account('ACME-000123', ACME_ID)]);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });
    await page.goto(`${baseURL}/records`);

    await dropNextPostingAnswer();
    await fillRecordForm(page, CREDIT);
    await confirmMovement(page);
    await expect.poll(async () => (await recordingRequests()).length).toBe(1);
    expect(await creditsOnAcme()).toBe(1);
    await expect(page.getByText('The ledger service did not answer. Confirm again to retry; the same idempotency key is sent.')).toBeVisible();

    await confirmAgain(page);

    await expect.poll(async () => (await recordingRequests()).length).toBe(2);
    const [first, second] = await recordingRequests();
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(await creditsOnAcme()).toBe(1);
  });

  test('the service refused it with ACCOUNT_FROZEN, and ACME-000123 was then reactivated', async ({ page, baseURL }) => {
    await seedLedgerAccounts([account('ACME-000123', ACME_ID, { status: 'Frozen' })]);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });
    await page.goto(`${baseURL}/records`);

    await fillRecordForm(page, CREDIT);
    await confirmMovement(page);
    await expect(page.getByRole('main').getByText(/\bACCOUNT_FROZEN\b/)).toBeVisible();
    await seedLedgerAccounts([account('ACME-000123', ACME_ID, { status: 'Active' })]);

    await confirmAgain(page);

    await expect.poll(async () => (await recordingRequests()).length).toBe(2);
    const [first, second] = await recordingRequests();
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    await expect.poll(creditsOnAcme).toBe(1);
  });

  test('she saw it succeed', async ({ page, baseURL }) => {
    await seedLedgerAccounts([account('ACME-000123', ACME_ID)]);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });
    await page.goto(`${baseURL}/records`);

    await fillRecordForm(page, CREDIT);
    await confirmMovement(page);
    await expect.poll(creditsOnAcme).toBe(1);
    await expect(page.getByRole('main').locator('tbody tr')).toHaveCount(1);

    await confirmAgain(page);

    await expect.poll(async () => (await recordingRequests()).length).toBe(2);
    const [first, second] = await recordingRequests();
    expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
    await expect.poll(creditsOnAcme).toBe(2);
  });
});
