/**
 * DRK-1669 §5:
 *   Scenario: The console is pointed at another directory without a rebuild
 *     Given the console is running against the Drunk Coding directory
 *     When the directory identifier is changed to another directory and the console is
 *       restarted
 *     Then sign-in goes to the other directory
 */
import { expect, test } from '@playwright/test';
import { defaultConsoleEnv, TENANT_OTHER_DIRECTORY } from '../support/fixtures';
import { startConsole, stopConsole } from '../support/console-process';

const PORT = 3204;
const BASE = `http://127.0.0.1:${PORT}`;

test('The console is pointed at another directory without a rebuild', async ({ page }) => {
  let handle = await startConsole(defaultConsoleEnv(PORT), PORT);
  try {
    await page.goto(`${BASE}/signin`);
    expect(page.url()).toContain('drunk-coding-tenant');

    await stopConsole(handle);
    // Same built application, no rebuild — only the environment changes.
    handle = await startConsole({ ...defaultConsoleEnv(PORT), CONSOLE_ENTRA_TENANT_ID: TENANT_OTHER_DIRECTORY }, PORT);

    await page.goto(`${BASE}/signin`);
    expect(page.url()).toContain(TENANT_OTHER_DIRECTORY);
    expect(page.url()).not.toContain('drunk-coding-tenant');
  } finally {
    await stopConsole(handle);
  }
});
