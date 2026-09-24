/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: The real service refuses a write the operator has no permission for
 *     Given the same stack, and the operator Nam who may read but not record postings
 *     When a credit of 25.00 SGD to ACME-000123 is sent on his behalf through the console
 *     Then the service refuses it
 *     And ACME-000123 still holds 100.00 SGD
 *
 * Sent through the console's pass-through, which forwards Nam's own token and never refuses a
 * declared route itself except with 401 (no session) or 404 (undeclared route)
 * (`app/api/ledger/[...route]/route.ts`): a 403 is the service's own permission check (brief
 * DRK-1730 R3). Mai sets the account up and reads it back. RED today: the end-to-end runner does
 * not start a stack.
 */
import { expect, test } from '@playwright/test';
import { signInAs } from '../support/sign-in';
import { MAI, NAM, e2eStack, holdAccountAt, throughConsole } from './support/stack';

test('The real service refuses a write the operator has no permission for', async ({ browser }) => {
  const stack = e2eStack();
  const maiContext = await browser.newContext();
  const mai = await maiContext.newPage();
  await signInAs(mai, { consoleBaseUrl: stack.consoleBaseUrl, email: MAI });
  const accountId = await holdAccountAt(mai, stack, 'ACME-000123', '100.00');

  const namContext = await browser.newContext();
  const nam = await namContext.newPage();
  await signInAs(nam, { consoleBaseUrl: stack.consoleBaseUrl, email: NAM });
  const refused = await throughConsole(nam, stack, 'POST', 'postings', {
    accountId,
    direction: 'Credit',
    amount: '25.00',
    currency: 'SGD',
    category: 'Transfer',
  });

  expect(refused.status).toBe(403);

  await mai.goto(`${stack.consoleBaseUrl}/accounts/ACME-000123`);
  await expect(mai.getByTestId('account-balance')).toHaveText(/^Balance\s*100\.00$/);

  await namContext.close();
  await maiContext.close();
});
