/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: A record opened again moves to the top once
 *     Given Mai's recently viewed list shows GLOBEX-000456 first and ACME-000123 third
 *     And she has opened ACME-000123 again
 *     When she returns to the Overview screen
 *     Then ACME-000123 is first, GLOBEX-000456 is second, and ACME-000123 is listed once
 *
 * The list is built the way an operator builds it: ACME-000123, then the group INITECH, then
 * GLOBEX-000456 — so a group entry sits between them. RED today: no screen keeps what was opened.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccountGroups, seedLedgerAccounts } from '../support/ledger';
import { openAccount, openGroup, panel } from '../support/overview';
import { ACME_ID, GLOBEX_ID, account } from '../support/records';
import { signInAs } from '../support/sign-in';

test('A record opened again moves to the top once', async ({ page, baseURL }) => {
  await seedLedgerAccountGroups([{ id: 'c6000000-0000-4000-8000-000000000001', code: 'INITECH', name: 'Initech', type: 'Customer', ownerId: 'ops' }]);
  await seedLedgerAccounts([account('ACME-000123', ACME_ID, { name: 'Acme Operating' }), account('GLOBEX-000456', GLOBEX_ID, { name: 'Globex Operating' })]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await openAccount(page, baseURL!, 'ACME-000123');
  await openGroup(page, baseURL!, 'INITECH');
  await openAccount(page, baseURL!, 'GLOBEX-000456');
  await page.goto(`${baseURL}/`);
  const entries = panel(page, 'Recently viewed').getByRole('listitem');
  await expect(entries).toHaveCount(3);
  await expect(entries.nth(0)).toContainText('GLOBEX-000456');
  await expect(entries.nth(2)).toContainText('ACME-000123');

  await openAccount(page, baseURL!, 'ACME-000123');
  await page.goto(`${baseURL}/`);

  await expect(entries).toHaveCount(3);
  await expect(entries.nth(0)).toContainText('ACME-000123');
  await expect(entries.nth(1)).toContainText('GLOBEX-000456');
  await expect(entries.nth(2)).toContainText('INITECH');
  await expect(entries.filter({ hasText: 'ACME-000123' })).toHaveCount(1);
});
