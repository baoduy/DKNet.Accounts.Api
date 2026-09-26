/**
 * DRK-1758 §5:
 *   @integration
 *   Scenario: A failed balance read never produces a floor figure
 *     Given the balance read for ACME-000123 fails
 *     When treasury-ops views ACME-000123 in the side panel
 *     Then the floor is stated as unavailable
 *
 * treasury-ops is `MAI`. The read fails at the service (`failLedgerRead`), behind the
 * console's pass-through. ACME-000123 permits an overdraft, so a floor worked out in the browser
 * would have a figure to show. The wording is the DRK-1763 brief §9 Q2 default:
 * "Floor unavailable — the balance could not be read."
 *
 * RED today: with no balance answer, `FloorLine` falls back to `computeFloor` and draws a
 * figure (`FloorLine.tsx:21-31,49`; DRK-1758 audit D2).
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { failLedgerRead, seedLedgerAccounts } from '../support/ledger';
import { ACME_ID, account } from '../support/records';
import { signInAs } from '../support/sign-in';

const FLOOR_FIGURE = /Floor\s*[−-]?\d/;

test('A failed balance read never produces a floor figure', async ({ page, baseURL }) => {
  await seedLedgerAccounts([account('ACME-000123', ACME_ID, { name: 'Acme operating', permittedToGoNegative: true, overdraftLimit: '50000.00' })]);
  // Given the balance read for ACME-000123 fails
  await failLedgerRead('/v1/accounts/[^/]+/balance', { status: 500, message: 'The balance could not be computed.' });
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/accounts`);

  // When treasury-ops views ACME-000123 in the side panel
  await page.getByRole('row', { name: /ACME-000123/ }).getByText('Acme operating', { exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'Details' });
  await expect(panel.getByText('Floor policy', { exact: true })).toBeVisible();

  // Then the floor is stated as unavailable
  await expect(panel.getByText('Floor unavailable — the balance could not be read.', { exact: true })).toBeVisible();
  await expect(panel).not.toContainText(FLOOR_FIGURE);
});
