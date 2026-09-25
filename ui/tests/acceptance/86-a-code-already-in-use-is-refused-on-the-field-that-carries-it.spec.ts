/**
 * DRK-1695 §5:
 *   Scenario Outline: A code already in use is refused on the field that carries it
 *     Given <record> already uses the code <code>
 *     When Mai tries to create another <record> with the code <code>
 *     Then the screen refuses on the code field and shows <refusal>
 *
 *     Examples:
 *       | record     | code    | refusal                    |
 *       | a group    | "TRSY"  | "DUPLICATE_GROUP_CODE"     |
 *       | a currency | "SGD"   | "DUPLICATE_CURRENCY_CODE"  |
 *
 * Drives `/groups` and `/currencies`. RED today: both screens are stubs that throw (rows
 * 11-12), so neither create form nor its field-routed refusal (`routeRefusal`, already built)
 * exists yet.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedAccountGroups } from '../support/ledger';
import { signInAs } from '../support/sign-in';

// DRK-1745: rewrite for the new form
test.fixme('A code already in use is refused on the code field — a group', async ({ page, baseURL }) => {
  await seedAccountGroups([{ code: 'TRSY', name: 'Treasury', ownerId: 'default-owner' }]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/groups`);

  await page.getByRole('button', { name: 'New group' }).click();
  await page.getByLabel('Code').fill('TRSY');
  await page.getByLabel('Name').fill('Treasury Two');
  await page.getByLabel('Owner', { exact: true }).fill('default-owner');
  await page.getByLabel('Type', { exact: true }).selectOption('Customer');
  await page.getByRole('button', { name: 'Create group' }).click();

  await expect(page.getByText('DUPLICATE_GROUP_CODE')).toBeVisible();
  await expect(page.getByLabel('Code')).toHaveAttribute('aria-invalid', 'true');
});

// DRK-1745: rewrite for the new form
test.fixme('A code already in use is refused on the code field — a currency', async ({ page, baseURL }) => {
  // SGD is seeded by default in `fake-ledger-service.ts` (`defaultCurrencies`) — no extra seed needed.
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/currencies`);

  await page.getByRole('button', { name: 'New currency' }).click();
  await page.getByLabel('Code').fill('SGD');
  await page.getByLabel('Name').fill('Singapore Dollar Two');
  await page.getByLabel('Decimal places').fill('2');
  await page.getByRole('button', { name: 'Register currency' }).click();

  await expect(page.getByText('DUPLICATE_CURRENCY_CODE')).toBeVisible();
  await expect(page.getByLabel('Code')).toHaveAttribute('aria-invalid', 'true');
});
