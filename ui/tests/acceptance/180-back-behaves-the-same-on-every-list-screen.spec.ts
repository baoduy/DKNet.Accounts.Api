/**
 * DRK-1758 §5:
 *   @integration
 *   Scenario Outline: Back behaves the same on every list screen
 *     Given treasury-ops is on the <screen> screen
 *     And treasury-ops changes the page from 1 to 2
 *     When treasury-ops presses Back
 *     Then the <screen> screen shows page 1
 *
 *     Examples:
 *       | screen         |
 *       | Accounts       |
 *       | Records        |
 *       | Account groups |
 *       | Currencies     |
 *
 * treasury-ops is `MAI`. Each screen is seeded with one record more than its default page size
 * of 10, so there is a page 2. "Shows page 1": the pager reads "Page 1 of 2" and the rows are
 * the ones page 1 showed before the change, on the same screen.
 *
 * RED today: the list screens seed their view from the address once and never re-read it on
 * Back (`AccountsScreen.tsx:72`, `RecordsScreen.tsx:86`); account groups replaces the history
 * entry instead of adding one (`AccountGroupsScreen.tsx:113`) and currencies keeps nothing in
 * the address (`CurrenciesScreen.tsx:67-80`), so Back leaves those two screens (DRK-1758 audit D4).
 */
import type { Page } from '@playwright/test';
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedAccountGroups, seedCurrencies, seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { ACME_ID, account, posting } from '../support/records';
import { signInAs } from '../support/sign-in';

const ELEVEN = Array.from({ length: 11 }, (_, i) => String(i + 1).padStart(2, '0'));

interface Row {
  screen: string;
  path: string;
  heading: string;
  seed: () => Promise<void>;
}

const ROWS: Row[] = [
  {
    screen: 'Accounts',
    path: '/accounts',
    heading: 'Accounts',
    seed: () => seedLedgerAccounts(ELEVEN.map((n) => account(`ACME-0000${n}`, `a0000000-0000-4000-8000-0000000000${n}`, { name: `Acme ${n}` }))),
  },
  {
    screen: 'Records',
    path: '/records',
    heading: 'Records',
    seed: async () => {
      await seedLedgerAccounts([account('ACME-000123', ACME_ID)]);
      await seedLedgerPostings(
        ELEVEN.map((n) => posting({ id: `b0000000-0000-4000-8000-0000000000${n}`, postingNumber: `PST-0000${n}`, accountId: ACME_ID, direction: 'Credit', amount: `${n}.00`, currency: 'SGD', category: 'Transfer' })),
      );
    },
  },
  {
    screen: 'Account groups',
    path: '/groups',
    heading: 'Account groups',
    seed: () => seedAccountGroups(ELEVEN.map((n) => ({ code: `GRP${n}`, name: `Group ${n}`, ownerId: 'treasury-ops' }))),
  },
  {
    screen: 'Currencies',
    path: '/currencies',
    heading: 'Currencies',
    // The fake ledger always carries SGD, JPY and BHD; 8 more make 11.
    seed: () => seedCurrencies(['AUD', 'CAD', 'CHF', 'EUR', 'GBP', 'HKD', 'NZD', 'USD'].map((code) => ({ code, name: code, decimalPlaces: 2 }))),
  },
];

function bodyRows(page: Page) {
  return page.getByRole('main').locator('tbody tr:not(:has(> td[colspan]))');
}

for (const row of ROWS) {
  test(`Back behaves the same on every list screen — ${row.screen}`, async ({ page, baseURL }) => {
    await row.seed();
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

    // Given treasury-ops is on the <screen> screen
    await page.goto(`${baseURL}${row.path}`);
    const pager = page.getByRole('navigation', { name: 'Pagination' });
    await expect(pager.getByText('Page 1 of 2', { exact: true })).toBeVisible();
    await expect(bodyRows(page)).toHaveCount(10);
    const pageOne = await bodyRows(page).allTextContents();

    // And treasury-ops changes the page from 1 to 2
    await pager.getByRole('button', { name: 'Next page' }).click();
    await expect(pager.getByText('Page 2 of 2', { exact: true })).toBeVisible();
    await expect(bodyRows(page)).toHaveCount(1);

    // When treasury-ops presses Back
    await page.goBack();

    // Then the <screen> screen shows page 1
    await expect(page.getByRole('heading', { name: row.heading, exact: true })).toBeVisible();
    await expect(pager.getByText('Page 1 of 2', { exact: true })).toBeVisible();
    await expect(bodyRows(page)).toHaveText(pageOne);
  });
}
