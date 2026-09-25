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
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedAccountGroups } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('A refusal that carries no code still shows what the service said', async ({ page, baseURL }) => {
  await seedAccountGroups([{ id: 'grp-trsy-no-code', code: 'TRSY', name: 'Treasury', ownerId: 'default-owner' }]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/groups`);

  await page.getByRole('row', { name: /TRSY/ }).click();
  await page.getByRole('button', { name: 'Edit group' }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();

  const panel = page.getByTestId('detail-panel');
  const alertLine = panel.locator('li').filter({ hasText: 'At least one field must be supplied.' });
  await expect(alertLine).toBeVisible();
  await expect(panel.getByText(/Trace:/)).toBeVisible();

  // dev-leader review: R4 — the service sent no code, so the console must invent none. The
  // alert's own line carries only the message when `error.code` is absent (`RefusalAlert.tsx`);
  // an exact match on the message alone catches a Build that renders an invented code before it.
  await expect(alertLine).toHaveText('At least one field must be supplied.');
});
