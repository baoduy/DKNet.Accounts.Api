/**
 * DRK-1679 §5:
 *   Scenario: The frame follows the operator's system theme without a reload
 *     Given the operator Mai has the console open with her system set to light
 *     When she switches her system to dark
 *     Then the frame draws in dark
 *     And she did not reload the page
 *
 * A behaviour-**preservation** scenario under R6, like "the frame an operator already knows
 * survives the rebuild" — green before the rebuild by definition, so it is a regression
 * guard here, not a RED-first gate. Its marker is the CSS-driven mechanism DRK-1679 §3 row
 * 9 requires: "Today's mechanism is `prefers-color-scheme` in CSS — keep a CSS-driven
 * mechanism; a JS class toggle that needs a reload fails the scenario." `AppShell`'s
 * `useLayoutEffect` (`ui/components/shell/AppShell.tsx:38-51`) mirrors the resolved custom
 * properties onto `document.body.style` in JS — a second, competing mechanism alongside
 * `Design/tokens/base.css:7-15`'s `body { background: var(--background) }` — and this AT's
 * last assertion forbids it: Build removes that effect (row 9 amendment, dev-leader ruling
 * on DRK-1680), and the CSS cascade alone must still carry the theme with no reload.
 *
 * Literal background colours copied from Design/tokens/colors.css (source of truth, R2):
 *   light --background #fbfcf8 · dark --background #020617
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { signInAs } from '../support/sign-in';

test('The frame follows the operator system theme without a reload', async ({ page, baseURL }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await expect(page.getByText('LEDGER')).toBeVisible();

  const lightBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(lightBackground).toBe('rgb(251, 252, 248)'); // #fbfcf8

  // A marker that only survives if the page never reloads or navigates.
  await page.evaluate(() => {
    (window as unknown as { __noReloadMarker?: boolean }).__noReloadMarker = true;
  });

  await page.emulateMedia({ colorScheme: 'dark' });

  const darkBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(darkBackground).toBe('rgb(2, 6, 23)'); // #020617
  expect(darkBackground).not.toBe(lightBackground);

  // She did not reload the page.
  const markerSurvived = await page.evaluate(
    () => (window as unknown as { __noReloadMarker?: boolean }).__noReloadMarker === true,
  );
  expect(markerSurvived).toBe(true);

  // A CSS-driven mechanism never mutates `<body>`'s inline style to apply the theme.
  const bodyStyleAttribute = await page.evaluate(() => document.body.getAttribute('style'));
  expect(bodyStyleAttribute).toBeNull();
});
