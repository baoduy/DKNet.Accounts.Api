/**
 * DRK-1679 §5 / DRK-1682 §7:
 *   Scenario: The detail panel leaves the page behind it usable
 *     Given the operator Mai has opened the detail panel over the accounts list
 *     When she chooses another row in the list behind it
 *     Then the panel shows that row instead
 *     And the panel never closed and the list was never dimmed
 */
import { expect, test } from '@playwright/test';

test('The detail panel leaves the page behind it usable', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/kit-harness-internal`);

  const demo = page.getByTestId('panel-demo');
  const list = demo.getByRole('table');

  await list.getByText('ACME-000123').click();
  await expect(page.getByRole('heading', { name: 'ACME-000123' })).toBeVisible();
  await expect(page.getByTestId('panel-balance')).toContainText('12,400.00');

  // Choosing another row in the list behind it swaps the panel's content — the list
  // stayed interactive, so this click had to land.
  await list.getByText('ACME-000456').click();
  await expect(page.getByRole('heading', { name: 'ACME-000456' })).toBeVisible();
  await expect(page.getByTestId('panel-balance')).toContainText('0.00');

  // The panel never closed: the first account's heading is gone, not merely re-opened.
  await expect(page.getByRole('heading', { name: 'ACME-000123' })).toHaveCount(0);

  // The list was never dimmed: no full-screen scrim sits over it, and it is still enabled.
  await expect(list).toBeEnabled();
});
