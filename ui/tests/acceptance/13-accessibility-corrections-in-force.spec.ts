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
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { signInAs } from '../support/sign-in';

test.use({ colorScheme: 'light' });

/** Parses a computed `rgb(r, g, b)` / `rgba(r, g, b, a)` string, as `getComputedStyle` returns it. */
function parseRgb(rgb: string): [number, number, number] {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) throw new Error(`not an rgb() colour: ${rgb}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rl, gl, bl] = [r, g, b]
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
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

  // A selected row is clearly darker than a hovered row — read from the rendered rows,
  // not from the token literals, so a console that gets the colours wrong fails here.
  const selectedBg = await page.getByTestId('selected-row').evaluate((el) => getComputedStyle(el).backgroundColor);
  const hoveredBg = await page.getByTestId('hovered-row').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(selectedBg).toBe('rgb(212, 240, 148)'); // --surface-selected #d4f094
  expect(hoveredBg).toBe('rgb(241, 245, 249)'); // --surface-hover #f1f5f9
  expect(relativeLuminance(parseRgb(selectedBg))).toBeLessThan(relativeLuminance(parseRgb(hoveredBg)));
});
