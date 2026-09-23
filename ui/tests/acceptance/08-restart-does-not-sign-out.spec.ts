/**
 * DRK-1669 §5:
 *   Scenario: Restarting the console does not sign the operator out
 *     Given Mai has signed in
 *     When the console is restarted
 *     And Mai opens the console again
 *     Then Mai is still signed in
 *     And Mai is not sent to Microsoft Entra ID
 *
 * Session state lives in Redis (§3 "Server-side state"), not in process memory, so this
 * runs its own dedicated console process to restart mid-test rather than the shared
 * `webServer` instance.
 */
import { expect, test } from '@playwright/test';
import { defaultConsoleEnv, MAI } from '../support/fixtures';
import { signInAs } from '../support/sign-in';
import { startConsole, stopConsole } from '../support/console-process';

const PORT = 3201;
const BASE = `http://127.0.0.1:${PORT}`;

test('Restarting the console does not sign the operator out', async ({ page }) => {
  let handle = await startConsole(defaultConsoleEnv(PORT), PORT);
  try {
    await signInAs(page, { consoleBaseUrl: BASE, email: MAI.email });
    await expect(page.getByText('LEDGER')).toBeVisible();

    await stopConsole(handle);
    handle = await startConsole(defaultConsoleEnv(PORT), PORT);

    await page.goto(`${BASE}/`);

    // Mai is still signed in — not sent to Microsoft Entra ID again.
    await expect(page.getByText('LEDGER')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0);
  } finally {
    await stopConsole(handle);
  }
});
