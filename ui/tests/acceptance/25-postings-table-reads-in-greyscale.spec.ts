/**
 * DRK-1679 §5 / DRK-1682 §7:
 *   Scenario: A postings table reads correctly with all colour removed
 *     Given a postings table holding a posted row, a reversed row and the reversal that
 *       reversed it
 *     And the table holds a debit row and a credit row
 *     When all colour is removed from the screen
 *     Then the operator can still tell the reversed row from the posted rows
 *     And the operator can still tell the debit row from the credit row
 *
 * Proved with a real CSS `filter: grayscale(1)` rendering (DRK-1682 §7 slice note), not
 * a `data-*` attribute stand-in for colour.
 */
import { expect, test } from '@playwright/test';

test('A postings table reads correctly with all colour removed', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/kit-harness-internal`);
  await page.addStyleTag({ content: 'html { filter: grayscale(1) !important; }' });

  const table = page.getByTestId('postings-greyscale-table');

  // The reversed row is told from the posted rows: it still names its own status and
  // its amount is struck through — neither depends on colour.
  const reversedRow = table.locator('tr', { hasText: 'PST-000003' });
  await expect(reversedRow).toContainText(/Reversed/);
  const reversedAmount = reversedRow.locator('text=1,000.00');
  await expect(reversedAmount.evaluate((el) => getComputedStyle(el).textDecorationLine)).resolves.toContain('line-through');

  const postedRow = table.locator('tr', { hasText: 'PST-000001' });
  const postedAmount = postedRow.locator('text=500.00');
  await expect(postedAmount.evaluate((el) => getComputedStyle(el).textDecorationLine)).resolves.not.toContain('line-through');

  // The debit row is told from the credit row: the sign character differs, not just hue.
  const creditRow = table.locator('tr', { hasText: 'PST-000001' });
  await expect(creditRow).toContainText('+500.00');
  const debitRow = table.locator('tr', { hasText: 'PST-000002' });
  await expect(debitRow).toContainText('−300.00');
});
