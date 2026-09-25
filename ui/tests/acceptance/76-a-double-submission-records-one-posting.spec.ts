/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario: A double submission records one posting
 *     Given the operator Mai has confirmed a credit of 250.00 SGD to ACME-000123
 *     When the same request reaches the service a second time
 *     Then the ledger holds 1 such posting, not 2
 *
 * §3 "Must stay true": the repeat returns the first posting. The second arrival is the first
 * request replayed byte for byte — same idempotency key, same body. RED today: no `/records`
 * route exists.
 */
import { expect, test } from '../support/test';
import { FAKE_LEDGER_BASE, MAI_WITH_WRITE } from '../support/fixtures';
import { ledgerPostings, recordingRequests, seedLedgerAccounts } from '../support/ledger';
import { ACME_ID, account, confirmMovement, fillRecordForm } from '../support/records';
import { signInAs } from '../support/sign-in';

// DRK-1745: rewrite for the new form
test.fixme('A double submission records one posting', async ({ page, baseURL }) => {
  await seedLedgerAccounts([account('ACME-000123', ACME_ID)]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });
  await page.goto(`${baseURL}/records`);
  await fillRecordForm(page, { accountNumber: 'ACME-000123', direction: 'Credit', amount: '250.00' });
  await confirmMovement(page);
  await expect.poll(async () => (await recordingRequests()).length).toBe(1);
  const [first] = await recordingRequests();
  expect(first.idempotencyKey).toBeTruthy();

  const repeat = await fetch(`${FAKE_LEDGER_BASE}/v1/postings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': first.idempotencyKey! },
    body: JSON.stringify(first.body),
  });

  const credits = (await ledgerPostings()).filter((p) => p.accountId === ACME_ID && p.direction === 'Credit' && p.amount === '250.00');
  expect(credits).toHaveLength(1);
  expect(repeat.ok).toBe(true);
  expect(((await repeat.json()) as { id: string }).id).toBe(credits[0].id);
});
