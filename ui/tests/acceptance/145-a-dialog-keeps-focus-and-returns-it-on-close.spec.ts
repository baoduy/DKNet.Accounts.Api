/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: A dialog keeps focus and returns it on close
 *     Given Mai opened the recording confirmation on the detail screen of ACME-000123 by keyboard
 *     When she presses Escape
 *     Then the confirmation closes and nothing is recorded
 *     And focus is back on Record posting
 *
 * Plus DRK-1725 §3 "A dialog must take focus when it opens and keep focus inside until it
 * closes": focus is inside the confirmation once it opens, and Tab and Shift+Tab keep it there.
 * Mai opens it the way the record form is driven by keyboard: Enter on `Record posting`, the
 * movement typed in, Enter on `Record`.
 *
 * RED today: `ConfirmMovement` opens its dialog with no close handler, so Escape leaves the
 * confirmation open (`ConfirmMovement.tsx:52`).
 */
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { recordingRequests, seedLedgerAccounts } from '../support/ledger';
import { ACME_ID, account } from '../support/records';
import { ACME_NUMBER } from '../support/screen-states';
import { signInAs } from '../support/sign-in';
import type { Locator } from '@playwright/test';

async function holdsFocus(dialog: Locator): Promise<boolean> {
  return dialog.evaluate((element) => element.contains(document.activeElement));
}

// DRK-1745: rewrite for the new form
test.fixme('A dialog keeps focus and returns it on close', async ({ page, baseURL }) => {
  await seedLedgerAccounts([account(ACME_NUMBER, ACME_ID)]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });
  await page.goto(`${baseURL}/accounts/${ACME_NUMBER}`);
  await expect(page.getByTestId('account-balance')).toBeVisible();

  const recordPosting = page.getByRole('button', { name: 'Record posting', exact: true });
  await recordPosting.focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Amount', { exact: true }).focus();
  await page.keyboard.type('25.00');
  await page.getByLabel('Category', { exact: true }).selectOption('Transfer');
  await page.getByRole('button', { name: 'Record', exact: true }).focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Credit 25.00 SGD to ACME-000123', { exact: true })).toBeVisible();
  await expect.poll(() => holdsFocus(dialog), { message: 'focus is inside the confirmation once it opens' }).toBe(true);
  for (const key of ['Tab', 'Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
    await page.keyboard.press(key);
    expect(await holdsFocus(dialog), `focus stays inside the confirmation after ${key}`).toBe(true);
  }

  await page.keyboard.press('Escape');

  await expect(dialog).toHaveCount(0);
  expect(await recordingRequests()).toHaveLength(0);
  await expect(recordPosting).toBeFocused();
});
