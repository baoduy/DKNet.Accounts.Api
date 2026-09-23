/**
 * DRK-1695 §5:
 *   Scenario: A refusal that carries no code still shows what the service said
 *     Given Mai has group "TRSY" open for editing
 *     When she saves it without having changed anything
 *     Then the screen shows the service's own wording for the refusal
 *     And no code is shown, and the trace reference is shown in its place
 *
 * `fake-ledger-service.ts`'s `PUT /v1/account-groups/:id` (row 14) refuses with
 * `{ message: 'At least one field must be supplied.' }` — no `code` — when the edit form
 * sends no changed field. Drives `/groups`. RED today: `AccountGroupsScreen` is a stub that
 * throws (row 11). R4: no code from the service means the console invents none, showing the
 * service's own wording and the `traceId` instead.
 */
import { expect, test } from '@playwright/test';
import { MAI } from '../support/fixtures';
import { seedAccountGroups } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('A refusal that carries no code still shows what the service said', async ({ page, baseURL }) => {
  await seedAccountGroups([{ code: 'TRSY', name: 'Treasury', ownerId: 'default-owner' }]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/groups`);

  await page.getByRole('row', { name: /TRSY/ }).click();
  await page.getByRole('button', { name: 'Edit group' }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();

  const panel = page.getByTestId('detail-panel');
  await expect(panel.getByText('At least one field must be supplied.')).toBeVisible();
  await expect(panel.getByText(/Trace:/)).toBeVisible();
});
