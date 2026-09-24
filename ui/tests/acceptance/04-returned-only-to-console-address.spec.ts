/**
 * DRK-1669 §5:
 *   Scenario: An operator is returned only to an address of the console
 *     Given Mai opens a sign-in link carrying a return address at another site
 *     When Mai signs in
 *     Then Mai lands on a page of the console
 *     And Mai is not sent to the other site
 */
import { expect, test } from '@playwright/test';
import { MAI } from '../support/fixtures';
import { signInAs } from '../support/sign-in';

const OTHER_SITE = 'https://not-the-console.example.com/steal';

test('An operator is returned only to an address of the console', async ({ page, baseURL }) => {
  await signInAs(page, {
    consoleBaseUrl: baseURL!,
    email: MAI.email,
    startPath: `/signin?returnTo=${encodeURIComponent(OTHER_SITE)}`,
  });

  // Mai lands on a page of the console — never on the other site (R5).
  await expect(page).toHaveURL(new RegExp(`^${baseURL!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`));
  expect(page.url()).not.toContain('not-the-console.example.com');
});
