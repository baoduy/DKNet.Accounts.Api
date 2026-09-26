/**
 * DRK-1758 §5:
 *   @integration
 *   Scenario Outline: A double-click sends one request
 *     Given treasury-ops has filled in the <form> form
 *     When treasury-ops double-clicks "<action>"
 *     Then the service receives 1 request
 *     And no refusal is shown for the <thing> just created
 *
 *     Examples:
 *       | form         | action            | thing    |
 *       | new group    | Create group      | group    |
 *       | new currency | Register currency | currency |
 *
 * treasury-ops is `MAI` (holds `accounts.write`). RED today: `Create group` and `Register
 * currency` stay enabled while their request is in flight, so the second click of the
 * double-click sends a second `POST` (DRK-1758 audit D1, `AccountGroupsScreen.tsx:413`,
 * `CurrenciesScreen.tsx:314-319`).
 */
import type { Page } from '@playwright/test';
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { ledgerRequests } from '../support/ledger';
import { signInAs } from '../support/sign-in';

interface Row {
  form: string;
  action: string;
  thing: string;
  screen: string;
  newButton: string;
  fill: (page: Page) => Promise<void>;
  /** The service's own create route, as the fake ledger logs it. */
  servicePath: string;
  /** The success card the created record is confirmed with. */
  created: string;
}

const ROWS: Row[] = [
  {
    form: 'new group',
    action: 'Create group',
    thing: 'group',
    screen: '/groups',
    newButton: 'New group',
    fill: async (page) => {
      await page.getByLabel('Code', { exact: true }).fill('TREASURY');
      await page.getByLabel('Name', { exact: true }).fill('Treasury');
      await page.getByLabel('Owner', { exact: true }).fill('treasury-ops');
      await page.getByLabel('Type', { exact: true }).selectOption('Internal');
    },
    servicePath: '/v1/account-groups',
    created: 'Group created',
  },
  {
    form: 'new currency',
    action: 'Register currency',
    thing: 'currency',
    screen: '/currencies',
    newButton: 'New currency',
    fill: async (page) => {
      await page.getByLabel('Code', { exact: true }).fill('THB');
      await page.getByLabel('Name', { exact: true }).fill('Thai Baht');
      await page.getByLabel('Decimal places', { exact: true }).fill('2');
    },
    servicePath: '/v1/currencies',
    created: 'Currency registered',
  },
];

for (const row of ROWS) {
  test(`A double-click sends one request — ${row.action}`, async ({ page, baseURL }) => {
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
    await page.goto(`${baseURL}${row.screen}`);

    // Given treasury-ops has filled in the <form> form
    await page.getByRole('button', { name: row.newButton, exact: true }).click();
    await row.fill(page);

    // When treasury-ops double-clicks "<action>"
    await page.getByRole('button', { name: row.action, exact: true }).dblclick();

    // Every answer is in before anything is counted: the card confirms the first, and the
    // network settling means a second request (if one was sent) has reached the service too.
    await expect(page.getByRole('status').getByText(row.created, { exact: true })).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Then the service receives 1 request
    const creates = (await ledgerRequests()).filter((request) => request.method === 'POST' && request.path === row.servicePath);
    expect(creates, `POST ${row.servicePath} requests the service received`).toHaveLength(1);

    // And no refusal is shown for the <thing> just created
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}
