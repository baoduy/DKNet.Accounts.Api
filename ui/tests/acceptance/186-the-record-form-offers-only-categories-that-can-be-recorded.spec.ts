/**
 * DRK-1886 — Scenarios to cover:
 *   R1: the Record posting form's Category select lists `Transfer, Payment, Fee, Interest,
 *   Adjustment, Refund, OpeningBalance`, in that order, with `Transfer` selected. `Reversal` is
 *   absent. Cover it on both mounts: the account detail screen and the Records screen.
 *
 * treasury-ops is `MAI_WITH_WRITE`. The service refuses `Reversal` on record (DRK-1813), so the
 * form stopped offering it in DRK-1880; this check holds that list on both screens that open the
 * form (`AccountDetail.tsx:241`, `RecordsScreen.tsx:149`).
 */
import type { Page } from '@playwright/test';
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { ACME_ID, account } from '../support/records';
import { signInAs } from '../support/sign-in';

const RECORDABLE = ['Transfer', 'Payment', 'Fee', 'Interest', 'Adjustment', 'Refund', 'OpeningBalance'];

const MOUNTS = [
  { screen: 'account detail', path: '/accounts/ACME-000123', heading: 'ACME-000123' },
  { screen: 'Records', path: '/records', heading: 'Records' },
];

function categorySelect(page: Page) {
  return page.getByRole('complementary', { name: 'Details' }).getByLabel('Category', { exact: true });
}

for (const mount of MOUNTS) {
  test(`The Record posting form offers only categories that can be recorded — ${mount.screen}`, async ({ page, baseURL }) => {
    await seedLedgerAccounts([account('ACME-000123', ACME_ID, { name: 'Acme operating' })]);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });
    await page.goto(`${baseURL}${mount.path}`);
    await expect(page.getByRole('heading', { name: mount.heading, exact: true })).toBeVisible();

    // Given the Record posting form is open
    await page.getByRole('button', { name: 'Record posting', exact: true }).click();
    const category = categorySelect(page);

    // Then its Category select lists the seven recordable categories, in order, Transfer selected
    await expect(category.locator('option')).toHaveText(RECORDABLE);
    await expect(category).toHaveValue('Transfer');
    // And Reversal is not offered
    await expect(category.locator('option', { hasText: 'Reversal' })).toHaveCount(0);
  });
}
