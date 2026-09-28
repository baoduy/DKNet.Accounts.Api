import { test as base, expect, type Page } from '@playwright/test';
import { OWN_CONSOLE_PORT, RUN_ID } from '../../support/fixtures';
import { type ConsoleHandle, startConsole, stopConsole } from '../../support/console-process';
import { resetLedger } from '../../support/ledger';
import { resetPostingSequence } from '../../support/records';
import { resetConsoleRedis } from '../../support/redis';
import { UI_ROOT } from '../../support/run';
import fs from 'node:fs';
import path from 'node:path';
import { KEYCLOAK_BASE, allowConsoleAddress, demoConsoleEnv, startAppHost, stopAppHost } from './apphost';

/**
 * Every AppHost check imports `test`/`expect` from here. The AppHost is started once for the worker (its Keycloak
 * is what every check signs in through) and stopped after the last check; each check starts from an empty cache
 * keyspace and an empty stand-in ledger, and drives a console of its own (`demoConsole`).
 */
export const test = base.extend<{ isolatedTestState: void; demoConsole: DemoConsole }, { appHost: void }>({
  appHost: [
    // Playwright reads the fixture names from this literal destructuring pattern.
    async ({}, use) => {
      const run = await startAppHost();
      try {
        await use();
      } finally {
        await stopAppHost(run);
      }
    },
    { scope: 'worker', timeout: 10 * 60_000 },
  ],
  isolatedTestState: [
    async ({ appHost }, use) => {
      void appHost;
      await resetConsoleRedis();
      await resetLedger();
      resetPostingSequence();
      await use();
    },
    { auto: true },
  ],
  demoConsole: async ({}, use) => {
    const demo = new DemoConsole();
    try {
      await use(demo);
    } finally {
      await demo.stop();
    }
  },
});

export { expect };

const ENV_FILE = path.join(UI_ROOT, '.env');
const ENV_BACKUP = path.join(UI_ROOT, `.env.apphost-check-${RUN_ID}`);

/**
 * This check's console: the AppHost's console sign-in values, started in `ui/` beside the local environment file
 * the check writes (`ui/.env`, which a developer's checkout links to the root `.env`). A developer's own file is
 * moved aside for the check and put back after it, however the check ends.
 */
export class DemoConsole {
  readonly baseUrl = `http://127.0.0.1:${OWN_CONSOLE_PORT}`;
  private handle: ConsoleHandle | undefined;
  private movedAside = false;

  async start(envFile: string | undefined): Promise<void> {
    if (fs.existsSync(ENV_FILE) || isLink(ENV_FILE)) {
      fs.renameSync(ENV_FILE, ENV_BACKUP);
      this.movedAside = true;
    }
    if (envFile !== undefined) fs.writeFileSync(ENV_FILE, envFile);
    const env = demoConsoleEnv(OWN_CONSOLE_PORT);
    await allowConsoleAddress(this.baseUrl);
    this.handle = await startConsole(env, OWN_CONSOLE_PORT);
  }

  async stop(): Promise<void> {
    try {
      if (this.handle) await stopConsole(this.handle);
    } finally {
      this.handle = undefined;
      fs.rmSync(ENV_FILE, { force: true });
      if (this.movedAside) fs.renameSync(ENV_BACKUP, ENV_FILE);
      this.movedAside = false;
    }
  }
}

function isLink(file: string): boolean {
  try {
    return fs.lstatSync(file).isSymbolicLink();
  } catch {
    return false;
  }
}

/** Keycloak's own login form: the realm asks for a user name and a password. */
export async function expectKeycloakLoginForm(page: Page): Promise<void> {
  await page.waitForURL((url) => url.origin === new URL(KEYCLOAK_BASE).origin);
  await expect(page.locator('#username')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
}

/** Opens the console and signs in through the demo realm's login form. */
export async function signInThroughKeycloak(page: Page, consoleBaseUrl: string, user: string, password: string): Promise<void> {
  await page.goto(`${consoleBaseUrl}/`);
  await expectKeycloakLoginForm(page);
  await page.locator('#username').fill(user);
  await page.locator('#password').fill(password);
  await page.locator('#kc-login').click();
  await page.waitForURL((url) => url.origin === new URL(consoleBaseUrl).origin);
}

/** The identity menu names the signed-in user (the token's `name`, else `preferred_username`). */
export async function expectSignedInAs(page: Page, user: string): Promise<void> {
  await page.getByRole('button', { name: 'Account menu' }).click();
  await expect(page.getByRole('menu').getByText(user, { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Account menu' }).click();
}
