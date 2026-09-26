/**
 * DRK-1758 §5:
 *   @integration
 *   Scenario: The currencies view survives a reload
 *     Given treasury-ops has filtered the currencies screen to inactive currencies, sorted by code, on page 2
 *     And closed currency JPY is open in the side panel
 *     When treasury-ops reloads the page
 *     Then the currencies screen shows inactive currencies, sorted by code, on page 2
 *     And closed currency JPY is still open in the side panel
 *
 * Written in the screen's own wording, "Closed" currencies (DRK-1758 spec-review carry-over 2).
 * treasury-ops is `MAI`. 12 closed currencies are seeded, 10 of them coded before JPY, so page 2
 * of the closed currencies in code order holds JPY and KRW; SGD and BHD (the fake's own) stay
 * active.
 *
 * RED today: the currencies screen keeps its filter, sort, page and open record in local state
 * only (`CurrenciesScreen.tsx:67-80`; DRK-1758 audit D4), so a reload opens it afresh.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedCurrencies } from '../support/ledger';
import { signInAs } from '../support/sign-in';

const CLOSED_BEFORE_JPY = ['AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD'];

function bodyRows(page: Page) {
  return page.getByRole('main').locator('tbody tr:not(:has(> td[colspan]))');
}

async function statusFilter(page: Page) {
  const filterButton = page.getByRole('button', { name: 'Filter', exact: true });
  if ((await filterButton.getAttribute('aria-expanded')) !== 'true') await filterButton.click();
  return page.getByRole('group', { name: 'Filters' }).getByLabel('Status', { exact: true });
}

test('The currencies view survives a reload', async ({ page, baseURL }) => {
  await seedCurrencies([
    ...CLOSED_BEFORE_JPY.map((code) => ({ code, name: code, decimalPlaces: 2, isActive: false })),
    { code: 'JPY', name: 'Japanese Yen', decimalPlaces: 0, isActive: false },
    { code: 'KRW', name: 'South Korean Won', decimalPlaces: 0, isActive: false },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/currencies`);
  const pager = page.getByRole('navigation', { name: 'Pagination' });
  const panel = page.getByTestId('detail-panel');

  // Given treasury-ops has filtered the currencies screen to Closed currencies, sorted by code, on page 2
  await (await statusFilter(page)).selectOption('Closed');
  await page.keyboard.press('Escape');
  await page.getByRole('columnheader', { name: 'Code' }).getByRole('button').click();
  await pager.getByRole('button', { name: 'Next page' }).click();
  await expect(pager.getByText('Page 2 of 2', { exact: true })).toBeVisible();
  // And closed currency JPY is open in the side panel
  await page.getByRole('row', { name: /\bJPY\b/ }).click();
  await expect(panel.getByText('JPY · Japanese Yen', { exact: true })).toBeVisible();

  // When treasury-ops reloads the page
  await page.reload();

  // Then the currencies screen shows Closed currencies, sorted by code, on page 2
  await expect(pager.getByText('Page 2 of 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Code' })).toHaveAttribute('aria-sort', 'ascending');
  await expect(bodyRows(page).locator('td:first-child')).toHaveText(['JPY', 'KRW']);
  // And closed currency JPY is still open in the side panel
  await expect(panel.getByText('JPY · Japanese Yen', { exact: true })).toBeVisible();
  // Read last: the filter menu opens over the table, and the panel must already be proven open.
  await expect(await statusFilter(page)).toHaveValue('Closed');
});
