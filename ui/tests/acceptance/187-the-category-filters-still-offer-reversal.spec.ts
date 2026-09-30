/**
 * DRK-1886 — Scenarios to cover:
 *   R2: the Category filters on the Records screen and the account postings panel still offer
 *   `Reversal`.
 *
 * treasury-ops is `MAI`. A reversal is a posting like any other once written, so both lists
 * narrow by it: `Any` plus all eight categories, in the service's order (`RecordsScreen.tsx:209`,
 * `PostingsPanel.tsx:127`). Only the Record posting form drops it (DRK-1880, spec 186).
 */
import type { Page } from '@playwright/test';
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { ACME_ID, account } from '../support/records';
import { signInAs } from '../support/sign-in';

const FILTER_CATEGORIES = ['Any', 'Transfer', 'Payment', 'Fee', 'Interest', 'Adjustment', 'Refund', 'Reversal', 'OpeningBalance'];

const FILTERS = [
  { screen: 'Records screen', path: '/records', heading: 'Records' },
  { screen: 'account postings panel', path: '/accounts/ACME-000123', heading: 'ACME-000123' },
];

async function categoryFilter(page: Page) {
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  return page.getByRole('group', { name: 'Filters' }).getByLabel('Category', { exact: true });
}

for (const filter of FILTERS) {
  test(`The Category filter still offers Reversal — ${filter.screen}`, async ({ page, baseURL }) => {
    await seedLedgerAccounts([account('ACME-000123', ACME_ID, { name: 'Acme operating' })]);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
    await page.goto(`${baseURL}${filter.path}`);
    await expect(page.getByRole('heading', { name: filter.heading, exact: true })).toBeVisible();

    // Given the Category filter is open
    const category = await categoryFilter(page);

    // Then it lists Any plus all eight categories, in order, Reversal included
    await expect(category.locator('option')).toHaveText(FILTER_CATEGORIES);
  });
}
