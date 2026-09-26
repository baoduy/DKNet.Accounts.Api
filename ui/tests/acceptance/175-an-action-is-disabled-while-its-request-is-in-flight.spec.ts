/**
 * DRK-1758 §5:
 *   @integration
 *   Scenario Outline: An action is disabled while its request is in flight
 *     Given treasury-ops has <record> open in the side panel
 *     When treasury-ops chooses "<action>" and the service has not yet answered
 *     Then "<action>" is disabled
 *
 *     Examples:
 *       | record                     | action          |
 *       | group ACME                 | Close group     |
 *       | closed currency JPY        | Reopen currency |
 *       | empty group ACME-OLD       | Delete group    |
 *       | group ACME with a new name | Save changes    |
 *
 * treasury-ops is `MAI` (holds `accounts.write`). "The service has not yet answered": the
 * write is held in the browser (`holdRequests`) until the check has looked at the control.
 * Close group is confirmed in a dialog; the control that must be disabled is the dialog's
 * confirm action (DRK-1758 spec-review carry-over 4).
 *
 * RED today: none of the four has an in-flight guard (DRK-1758 audit D1 and carry-over 5,
 * `AccountGroupsScreen.tsx:384-397,413`, `CurrenciesScreen.tsx:291-297`), and the close
 * dialog shuts before its request is sent.
 */
import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { holdRequests } from '../support/hold-requests';
import { seedAccountGroups, seedCurrencies } from '../support/ledger';
import { signInAs } from '../support/sign-in';

interface Row {
  record: string;
  action: string;
  screen: string;
  seed: () => Promise<void>;
  /** The row the record is opened from. */
  rowName: RegExp;
  /** The write "<action>" sends, as the browser sends it to the console. */
  method: string;
  url: RegExp;
  /** Gets from the open panel to the point just before "<action>" is chosen. */
  prepare?: (page: Page) => Promise<void>;
  /** Chooses "<action>" and returns the control that must now be disabled. */
  choose: (page: Page) => Promise<Locator>;
}

function panel(page: Page): Locator {
  return page.getByTestId('detail-panel');
}

const ROWS: Row[] = [
  {
    record: 'group ACME',
    action: 'Close group',
    screen: '/groups',
    seed: () => seedAccountGroups([{ id: 'grp-acme', code: 'ACME', name: 'Acme Corporation', ownerId: 'treasury-ops' }]),
    rowName: /\bACME\b/,
    method: 'POST',
    url: /\/api\/ledger\/account-groups\/grp-acme\/close$/,
    choose: async (page) => {
      await panel(page).getByRole('button', { name: 'Close group', exact: true }).click();
      const confirm = page.getByRole('dialog').getByRole('button', { name: 'Close group', exact: true });
      await confirm.click();
      return confirm;
    },
  },
  {
    record: 'closed currency JPY',
    action: 'Reopen currency',
    screen: '/currencies',
    seed: () => seedCurrencies([{ code: 'JPY', name: 'Japanese Yen', decimalPlaces: 0, isActive: false }]),
    rowName: /\bJPY\b/,
    method: 'POST',
    url: /\/api\/ledger\/currencies\/[^/]+\/activate$/,
    choose: async (page) => {
      const reopen = panel(page).getByRole('button', { name: 'Reopen currency', exact: true });
      await reopen.click();
      return reopen;
    },
  },
  {
    record: 'empty group ACME-OLD',
    action: 'Delete group',
    screen: '/groups',
    seed: () => seedAccountGroups([{ id: 'grp-acme-old', code: 'ACME-OLD', name: 'Acme (retired)', ownerId: 'treasury-ops' }]),
    rowName: /\bACME-OLD\b/,
    method: 'DELETE',
    url: /\/api\/ledger\/account-groups\/grp-acme-old$/,
    choose: async (page) => {
      const remove = panel(page).getByRole('button', { name: 'Delete group', exact: true });
      await remove.click();
      return remove;
    },
  },
  {
    record: 'group ACME with a new name',
    action: 'Save changes',
    screen: '/groups',
    seed: () => seedAccountGroups([{ id: 'grp-acme', code: 'ACME', name: 'Acme Corporation', ownerId: 'treasury-ops' }]),
    rowName: /\bACME\b/,
    method: 'PUT',
    url: /\/api\/ledger\/account-groups\/grp-acme$/,
    prepare: async (page) => {
      await panel(page).getByRole('button', { name: 'Edit group', exact: true }).click();
      await panel(page).getByLabel('Name', { exact: true }).fill('Acme Holdings');
    },
    choose: async (page) => {
      const save = panel(page).getByRole('button', { name: 'Save changes', exact: true });
      await save.click();
      return save;
    },
  },
];

for (const row of ROWS) {
  test(`An action is disabled while its request is in flight — ${row.action}`, async ({ page, baseURL }) => {
    await row.seed();
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
    const held = await holdRequests(page, row.method, row.url);
    await page.goto(`${baseURL}${row.screen}`);

    // Given treasury-ops has <record> open in the side panel
    await page.getByRole('row', { name: row.rowName }).click();
    await expect(panel(page).getByRole('button', { name: row.prepare ? 'Edit group' : row.action, exact: true })).toBeEnabled();
    await row.prepare?.(page);

    // When treasury-ops chooses "<action>" and the service has not yet answered
    const control = await row.choose(page);
    await expect.poll(() => held.count(), { message: `the ${row.action} request left the browser and is held` }).toBe(1);

    // Then "<action>" is disabled
    await expect(control).toBeDisabled();

    held.release();
  });
}
