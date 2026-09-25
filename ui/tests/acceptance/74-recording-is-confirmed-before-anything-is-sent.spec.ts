/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario Outline: Recording is confirmed before anything is sent
 *     Given the operator Mai is on the <screen>
 *     When she records a credit of 250.00 SGD to ACME-000123
 *     Then she is asked to confirm "Credit 250.00 SGD to ACME-000123"
 *     And nothing is recorded until she confirms
 *
 *     Examples:
 *       | screen                            |
 *       | Records screen                    |
 *       | detail screen of ACME-000123      |
 *
 * Plus DRK-1713 §3 "The confirmation restates the amount exactly as the operator typed it" and
 * stage 2 rule R3 (brief §6): an amount is a string from input to wire to screen, never
 * through `Number`. 9007199254740993.01 has no exact binary floating-point form — any step
 * through `Number`/`parseFloat` loses its last digits. RED today: no `/records` route, and the
 * detail screen's form records at once, with no confirmation.
 */
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { recordingRequests, seedLedgerAccounts } from '../support/ledger';
import { ACME_ID, account, cellText, confirmMovement, fillRecordForm, recordRows } from '../support/records';
import { signInAs } from '../support/sign-in';

const SCREENS = [
  { screen: 'Records screen', path: '/records' },
  { screen: 'detail screen of ACME-000123', path: '/accounts/ACME-000123' },
];

for (const { screen, path } of SCREENS) {
  // DRK-1745: rewrite for the new form
  test.fixme(`Recording is confirmed before anything is sent — ${screen}`, async ({ page, baseURL }) => {
    await seedLedgerAccounts([account('ACME-000123', ACME_ID)]);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });
    await page.goto(`${baseURL}${path}`);

    await fillRecordForm(page, { accountNumber: 'ACME-000123', direction: 'Credit', amount: '250.00' });

    await expect(page.getByRole('dialog').getByText('Credit 250.00 SGD to ACME-000123', { exact: true })).toBeVisible();
    expect(await recordingRequests()).toHaveLength(0);

    await confirmMovement(page);

    await expect.poll(async () => (await recordingRequests()).length).toBe(1);
    const [sent] = await recordingRequests();
    expect(sent.body.accountId).toBe(ACME_ID);
    expect(sent.body.direction).toBe('Credit');
    expect(sent.body.amount).toBe('250.00');
    expect(sent.body.currency).toBe('SGD');
  });
}

// DRK-1745: rewrite for the new form
test.fixme('The confirmation restates the amount exactly as the operator typed it', async ({ page, baseURL }) => {
  await seedLedgerAccounts([account('ACME-000123', ACME_ID)]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });
  await page.goto(`${baseURL}/records`);

  await fillRecordForm(page, { accountNumber: 'ACME-000123', direction: 'Credit', amount: '250.5' });

  await expect(page.getByRole('dialog').getByText('Credit 250.5 SGD to ACME-000123', { exact: true })).toBeVisible();
});

// DRK-1745: rewrite for the new form
test.fixme('R3 — an amount is never passed through a number, from input to wire to screen', async ({ page, baseURL }) => {
  await seedLedgerAccounts([account('ACME-000123', ACME_ID)]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });
  await page.goto(`${baseURL}/records`);

  await fillRecordForm(page, { accountNumber: 'ACME-000123', direction: 'Credit', amount: '9007199254740993.01' });
  await expect(page.getByRole('dialog').getByText('Credit 9007199254740993.01 SGD to ACME-000123', { exact: true })).toBeVisible();
  await confirmMovement(page);

  await expect.poll(async () => (await recordingRequests()).length).toBe(1);
  expect((await recordingRequests())[0].body.amount).toBe('9007199254740993.01');
  await expect(recordRows(page)).toHaveCount(1);
  // Digit grouping is the screen's to choose; every digit the ledger holds is not.
  expect((await cellText(page, recordRows(page).first(), 'Amount')).replaceAll(',', '')).toBe('9007199254740993.01');
});
