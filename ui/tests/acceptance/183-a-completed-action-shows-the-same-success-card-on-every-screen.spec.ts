/**
 * DRK-1758 §5:
 *   @integration
 *   Scenario Outline: A completed action shows the same success card on every screen
 *     Given treasury-ops is on the <screen> screen
 *     When treasury-ops <completes an action>
 *     Then a success card titled "<title>" is shown and announced to a screen reader
 *     And the card stays until treasury-ops dismisses it
 *
 *     Examples:
 *       | screen         | completes an action                      | title               |
 *       | Accounts       | opens a new SGD account in group ACME    | Account opened      |
 *       | Records        | records a 100.00 SGD posting             | Record posted       |
 *       | Account groups | creates group TREASURY                   | Group created       |
 *       | Currencies     | registers currency THB at 2 places       | Currency registered |
 *
 * treasury-ops is `MAI_WITH_WRITE`. "Announced to a screen reader": the card is a `status`
 * live region. "Stays until dismissed": the page's clock is run 10 minutes forward and the card
 * is still there; its own "Dismiss" control, pressed by keyboard, then removes it.
 *
 * Today each screen keeps its own card state over `Acknowledgement` (`RecordsScreen.tsx:82`,
 * `AccountGroupsScreen.tsx:140`, `CurrenciesScreen.tsx:74`, `AccountsScreen.tsx:65`); DRK-1763
 * brief §3 row 8 moves all of them onto one hook, which this check holds to the same behaviour.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { seedLedgerAccountGroups, seedLedgerAccounts } from '../support/ledger';
import { ACME_ID, account } from '../support/records';
import { signInAs } from '../support/sign-in';

interface Row {
  screen: string;
  action: string;
  title: string;
  path: string;
  seed: () => Promise<void>;
  complete: (page: Page) => Promise<void>;
}

function panel(page: Page) {
  return page.getByRole('complementary', { name: 'Details' });
}

const ROWS: Row[] = [
  {
    screen: 'Accounts',
    action: 'opens a new SGD account in group ACME',
    title: 'Account opened',
    path: '/accounts',
    seed: () => seedLedgerAccountGroups([{ id: 'group-acme', code: 'ACME', name: 'Acme Corporation', type: 'Customer' }]),
    complete: async (page) => {
      await page.getByRole('button', { name: 'Open account', exact: true }).click();
      await panel(page).getByLabel('Group', { exact: true }).selectOption({ label: 'ACME' });
      await panel(page).getByLabel('Name', { exact: true }).fill('Acme operating');
      await panel(page).getByLabel('Currency', { exact: true }).selectOption('SGD');
      await panel(page).getByRole('button', { name: 'Open account', exact: true }).click();
    },
  },
  {
    screen: 'Records',
    action: 'records a 100.00 SGD posting',
    title: 'Record posted',
    path: '/records',
    seed: () => seedLedgerAccounts([account('ACME-000123', ACME_ID, { name: 'Acme operating' })]),
    complete: async (page) => {
      await page.getByRole('button', { name: 'Record posting', exact: true }).click();
      await panel(page).getByLabel('Account', { exact: true }).selectOption({ label: 'ACME-000123 — Acme operating' });
      await panel(page).getByLabel('Direction', { exact: true }).selectOption('Credit');
      await panel(page).getByLabel('Amount', { exact: true }).fill('100.00');
      await panel(page).getByLabel('Category', { exact: true }).selectOption('Transfer');
      await panel(page).getByRole('button', { name: 'Review movement', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Record posting', exact: true }).click();
    },
  },
  {
    screen: 'Account groups',
    action: 'creates group TREASURY',
    title: 'Group created',
    path: '/groups',
    seed: async () => undefined,
    complete: async (page) => {
      await page.getByRole('button', { name: 'New group', exact: true }).click();
      await panel(page).getByLabel('Code', { exact: true }).fill('TREASURY');
      await panel(page).getByLabel('Name', { exact: true }).fill('Treasury');
      await panel(page).getByLabel('Owner', { exact: true }).fill('treasury-ops');
      await panel(page).getByRole('button', { name: 'Create group', exact: true }).click();
    },
  },
  {
    screen: 'Currencies',
    action: 'registers currency THB at 2 places',
    title: 'Currency registered',
    path: '/currencies',
    seed: async () => undefined,
    complete: async (page) => {
      await page.getByRole('button', { name: 'New currency', exact: true }).click();
      await panel(page).getByLabel('Code', { exact: true }).fill('THB');
      await panel(page).getByLabel('Name', { exact: true }).fill('Thai Baht');
      await panel(page).getByLabel('Decimal places', { exact: true }).fill('2');
      await panel(page).getByRole('button', { name: 'Register currency', exact: true }).click();
    },
  },
];

for (const row of ROWS) {
  test(`A completed action shows the same success card on every screen — ${row.screen}`, async ({ page, baseURL }) => {
    await row.seed();
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });
    await page.clock.install();

    // Given treasury-ops is on the <screen> screen
    await page.goto(`${baseURL}${row.path}`);
    await expect(page.getByRole('heading', { name: row.screen, exact: true })).toBeVisible();

    // When treasury-ops <completes an action>
    await row.complete(page);

    // Then a success card titled "<title>" is shown and announced to a screen reader
    const card = page.getByRole('status').filter({ has: page.getByText(row.title, { exact: true }) });
    await expect(card).toBeVisible();

    // And the card stays until treasury-ops dismisses it
    await page.clock.fastForward('10:00');
    await expect(card).toBeVisible();
    // By keyboard: on the screens where the side panel stays open, it covers the card's right
    // edge, where Dismiss sits — the panel is layout this change must not touch (DRK-1763 §4).
    await card.getByRole('button', { name: 'Dismiss' }).focus();
    await page.keyboard.press('Enter');
    await expect(card).toHaveCount(0);
  });
}
