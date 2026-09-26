/**
 * DRK-1758 §5:
 *   @integration
 *   Scenario Outline: Unsaved edits raise the same warning on every screen
 *     Given treasury-ops has changed the name of <record> in the <screen> side panel
 *     When treasury-ops closes the panel
 *     Then the "Discard unsaved changes?" warning asks treasury-ops to keep editing or discard
 *     And choosing to keep editing leaves the new name in place
 *
 *     Examples:
 *       | screen         | record              |
 *       | Accounts       | account ACME-000123 |
 *       | Account groups | group ACME          |
 *       | Currencies     | currency SGD        |
 *
 * treasury-ops is `MAI_WITH_WRITE`. The panel is closed by its own close control ("Close
 * details"). The warning's two choices are the design kit's "Keep editing" and "Discard changes".
 *
 * Today each screen raises this warning from its own copy (`AccountPanel.tsx:32`,
 * `AccountGroupsScreen.tsx:133,177,183`, `CurrenciesScreen.tsx:67,116,119`); DRK-1763 brief §3
 * row 7 moves all three onto one panel-state hook, which this check holds to the same behaviour.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { seedAccountGroups, seedLedgerAccounts } from '../support/ledger';
import { ACME_ID, account } from '../support/records';
import { signInAs } from '../support/sign-in';

interface Row {
  screen: string;
  record: string;
  path: string;
  seed: () => Promise<void>;
  open: (page: Page) => Promise<void>;
  editAction: string;
  newName: string;
}

const ROWS: Row[] = [
  {
    screen: 'Accounts',
    record: 'account ACME-000123',
    path: '/accounts',
    seed: () => seedLedgerAccounts([account('ACME-000123', ACME_ID, { name: 'Acme operating' })]),
    open: (page) => page.getByRole('row', { name: /ACME-000123/ }).getByText('Acme operating', { exact: true }).click(),
    editAction: 'Edit account',
    newName: 'Acme treasury',
  },
  {
    screen: 'Account groups',
    record: 'group ACME',
    path: '/groups',
    seed: () => seedAccountGroups([{ code: 'ACME', name: 'Acme Corporation', ownerId: 'treasury-ops' }]),
    open: (page) => page.getByRole('row', { name: /\bACME\b/ }).click(),
    editAction: 'Edit group',
    newName: 'Acme Holdings',
  },
  {
    screen: 'Currencies',
    record: 'currency SGD',
    path: '/currencies',
    seed: async () => undefined, // SGD is one of the fake ledger's own currencies.
    open: (page) => page.getByRole('row', { name: /\bSGD\b/ }).click(),
    editAction: 'Edit currency',
    newName: 'Singapore dollar (SGD)',
  },
];

for (const row of ROWS) {
  test(`Unsaved edits raise the same warning on every screen — ${row.screen}`, async ({ page, baseURL }) => {
    await row.seed();
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });
    await page.goto(`${baseURL}${row.path}`);
    const panel = page.getByRole('complementary', { name: 'Details' });

    // Given treasury-ops has changed the name of <record> in the <screen> side panel
    await row.open(page);
    await panel.getByRole('button', { name: row.editAction, exact: true }).click();
    const name = panel.getByLabel('Name', { exact: true });
    await name.fill(row.newName);

    // When treasury-ops closes the panel
    await panel.getByRole('button', { name: 'Close details' }).click();

    // Then the "Discard unsaved changes?" warning asks treasury-ops to keep editing or discard
    const warning = page.getByRole('dialog', { name: 'Discard unsaved changes?' });
    await expect(warning).toBeVisible();
    await expect(warning.getByRole('button')).toHaveText(['Keep editing', 'Discard changes']);

    // And choosing to keep editing leaves the new name in place
    await warning.getByRole('button', { name: 'Keep editing', exact: true }).click();
    await expect(warning).toHaveCount(0);
    await expect(name).toHaveValue(row.newName);
  });
}
