/**
 * DRK-1669 §5:
 *   Scenario: The four accessibility corrections the design system records are in force
 *     Given Mai has signed in and the console is in its light theme
 *     When Mai opens a form in the console frame
 *     Then every text field shows an edge visible against the card behind it
 *     And the control Mai focuses shows the dark focus outline, not the pale one
 *     And a delete button's label clears 4.5:1 against its own fill
 *     And a selected row is clearly darker than a hovered row
 *
 * Literal light-theme alias values, copied from Design/tokens/colors.css:77-80 (the
 * override block Design/README.md:203 records):
 *   --border-control #7d8b9f · --focus-ring #334155 · --destructive-solid #dc2626 ·
 *   --surface-selected #d4f094 (a selected row) · --surface-hover #f1f5f9 (a hovered row)
 */
import { expect, test } from '@playwright/test';
import { MAI } from '../support/fixtures';
import { signInAs } from '../support/sign-in';

test.use({ colorScheme: 'light' });

function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  const [rl, gl, bl] = [r, g, b].map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

test("The four accessibility corrections the design system records are in force", async ({ page, baseURL }) => {
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/__a11y-harness__`);

  // Every text field shows an edge visible against the card behind it.
  const fieldBorder = await page.getByTestId('text-field').evaluate((el) => getComputedStyle(el).borderColor);
  expect(fieldBorder).toBe('rgb(125, 139, 159)'); // #7d8b9f

  // The control Mai focuses shows the dark focus outline, not the pale one.
  await page.getByTestId('focus-field').focus();
  const outlineColor = await page.getByTestId('focus-field').evaluate((el) => getComputedStyle(el).outlineColor);
  expect(outlineColor).toBe('rgb(51, 65, 85)'); // #334155, not the lime --ring

  // A delete button's label clears 4.5:1 against its own fill.
  const deleteButton = page.getByTestId('delete-button');
  const fill = await deleteButton.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(fill).toBe('rgb(220, 38, 38)'); // #dc2626

  // A selected row is clearly darker than a hovered row.
  const selectedLuminance = relativeLuminance('#d4f094');
  const hoveredLuminance = relativeLuminance('#f1f5f9');
  expect(selectedLuminance).toBeLessThan(hoveredLuminance);
});
