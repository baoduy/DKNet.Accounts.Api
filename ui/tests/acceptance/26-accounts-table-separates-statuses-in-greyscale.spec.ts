/**
 * DRK-1679 §5 / DRK-1682 §7:
 *   Scenario: An accounts table separates its statuses with all colour removed
 *     Given an accounts table holding an active, a dormant and a frozen account
 *     When all colour is removed from the screen
 *     Then the operator can still tell the three statuses apart
 *
 * Proved with a real CSS `filter: grayscale(1)` rendering, not a `data-*` attribute
 * stand-in for colour: the status word itself is always rendered (StatusBadge.d.ts).
 */
import { expect, test } from '../support/test';

test('An accounts table separates its statuses with all colour removed', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/kit-harness-internal`);
  await page.addStyleTag({ content: 'html { filter: grayscale(1) !important; }' });

  const table = page.getByTestId('accounts-greyscale-table');

  await expect(table.locator('tr', { hasText: 'ACME-000123' })).toContainText('Active');
  await expect(table.locator('tr', { hasText: 'ACME-000456' })).toContainText('Dormant');
  await expect(table.locator('tr', { hasText: 'ACME-000789' })).toContainText('Frozen');
});
