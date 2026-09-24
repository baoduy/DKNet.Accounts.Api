/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: A side panel leaves the page behind it usable
 *     Given Mai opened the group ACME in its side panel on the Account groups screen
 *     When she presses Tab past the panel's last control
 *     Then focus reaches the groups list behind the panel
 *     And the panel stays open
 *
 * Plus brief §3 row 8: opening the panel moves focus into it (so the keyboard is where the new
 * content is), and it traps nothing — Tab carries on past its last control, in the page's own
 * order, until it reaches the groups list. Spec 27 covers the same panel on the kit harness with
 * the pointer; this is the real groups screen, with the keyboard.
 *
 * RED today: choosing a row leaves focus where it was — nothing moves it into the panel.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccountGroups } from '../support/ledger';
import { openGroup } from '../support/overview';
import { ACME_GROUP_ID } from '../support/screen-states';
import { signInAs } from '../support/sign-in';

const USABLE_CONTROL = 'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

test('A side panel leaves the page behind it usable', async ({ page, baseURL }) => {
  await seedLedgerAccountGroups([
    { id: ACME_GROUP_ID, code: 'ACME', name: 'Acme Group', type: 'Customer', ownerId: 'acme-ops' },
    { id: '9a4c7e21-5d6f-4a8b-9c0d-000000000201', code: 'GLOBEX', name: 'Globex Group', type: 'Merchant', ownerId: 'partner-01' },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  await openGroup(page, baseURL!, 'ACME');
  const panel = page.getByTestId('detail-panel');
  await expect(panel.getByText('ACME', { exact: true })).toBeVisible();
  await expect.poll(() => panel.evaluate((element) => element.contains(document.activeElement)), { message: 'focus moved into the panel when it opened' }).toBe(true);

  await panel.locator(USABLE_CONTROL).filter({ visible: true }).last().focus();
  let reachedList = false;
  for (let press = 0; press < 60 && !reachedList; press += 1) {
    await page.keyboard.press('Tab');
    await expect(panel, 'the panel stays open').toBeVisible();
    reachedList = await page.evaluate(() => {
      const active = document.activeElement;
      return active !== null && active.closest('main table') !== null && active.closest('[data-testid="detail-panel"]') === null;
    });
  }

  expect(reachedList, 'focus reached the groups list behind the panel').toBe(true);
  await expect(panel.getByText('ACME', { exact: true })).toBeVisible();
});
