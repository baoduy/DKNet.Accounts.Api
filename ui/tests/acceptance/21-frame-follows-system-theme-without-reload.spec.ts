/**
 * DRK-1679 §5:
 *   Scenario: The frame follows the operator's system theme without a reload
 *     Given the operator Mai has the console open with her system set to light
 *     When she switches her system to dark
 *     Then the frame draws in dark
 *     And she did not reload the page
 *
 * DRK-1679 §3 row 9: "Today's mechanism is `prefers-color-scheme` in CSS — keep a
 * CSS-driven mechanism; a JS class toggle that needs a reload fails the scenario."
 * `Design/tokens/base.css:7-15` already sets `body { background: var(--background) }`, so
 * the theme already flips through pure CSS cascade with no reload, in a real browser, today
 * — confirmed empirically: `document.body` carries no inline `style` attribute despite
 * `AppShell`'s `useLayoutEffect` (`ui/components/shell/AppShell.tsx:38-51`) also writing
 * one, and both computed background colours below already match. This AT is GREEN against
 * today's code (see the RED-authoring report: this scenario needed no new work to satisfy,
 * only the AT to pin it, which is the whole discovery this run reports up).
 *
 * Literal background colours copied from Design/tokens/colors.css (source of truth, R2):
 *   light --background #fbfcf8 · dark --background #020617
 */
import { expect, test } from '@playwright/test';
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
