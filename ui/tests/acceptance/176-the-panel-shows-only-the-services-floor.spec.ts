/**
 * DRK-1758 §5:
 *   @integration
 *   Scenario: The panel shows only the service's floor
 *     Given ACME-000123 permits an overdraft of 50,000.00 SGD
 *     And the balance read has not answered yet
 *     When treasury-ops opens ACME-000123 in the side panel
 *     Then the floor shows a placeholder, not a figure
 *     And once the balance read answers, the floor reads −50,000.00 SGD
 *
 * treasury-ops is `MAI`. "The balance read has not answered yet": the panel's
 * `GET /api/ledger/accounts/{id}/balance` is held in the browser (`holdRequests`) until the
 * check releases it. The placeholder is the existing `Skeleton` (DRK-1763 brief §9 Q2 default).
 *
 * RED today: while the balance read is outstanding, `FloorLine` draws a floor the browser
 * worked out with `Number`/`Math.max` (`computeFloor`, `FloorLine.tsx:21-31,49`; DRK-1758 audit D2).
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { holdRequests } from '../support/hold-requests';
import { seedLedgerAccounts } from '../support/ledger';
import { ACME_ID, account } from '../support/records';
import { signInAs } from '../support/sign-in';

/** Any floor stated as a figure: "Floor", then an amount (signed or not). */
const FLOOR_FIGURE = /Floor\s*[−-]?\d/;

test("The panel shows only the service's floor", async ({ page, baseURL }) => {
  // Given ACME-000123 permits an overdraft of 50,000.00 SGD
  await seedLedgerAccounts([account('ACME-000123', ACME_ID, { name: 'Acme operating', permittedToGoNegative: true, overdraftLimit: '50000.00' })]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  // And the balance read has not answered yet
  const balanceRead = await holdRequests(page, 'GET', /\/api\/ledger\/accounts\/[^/]+\/balance$/);
  await page.goto(`${baseURL}/accounts`);

  // When treasury-ops opens ACME-000123 in the side panel
  await page.getByRole('row', { name: /ACME-000123/ }).getByText('Acme operating', { exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'Details' });
  await expect(panel.getByText('Floor policy', { exact: true })).toBeVisible();
  await expect.poll(() => balanceRead.count(), { message: 'the panel asked for the balance and is waiting on it' }).toBeGreaterThan(0);

  // Then the floor shows a placeholder, not a figure
  await expect(panel).not.toContainText(FLOOR_FIGURE);
  await expect(panel.locator('[data-slot="skeleton"]')).toBeVisible();

  // And once the balance read answers, the floor reads −50,000.00 SGD
  balanceRead.release();
  await expect(panel.getByText(/^Floor −50,000\.00 SGD\b/)).toBeVisible();
  await expect(panel.locator('[data-slot="skeleton"]')).toHaveCount(0);
});
