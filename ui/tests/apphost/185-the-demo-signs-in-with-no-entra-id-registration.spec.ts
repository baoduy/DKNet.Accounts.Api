/**
 * DRK-1796 §5:
 *   @integration
 *   Scenario Outline: The demo signs in with no Entra ID registration
 *     Given the local environment file <entra values>
 *     And AppHost is running
 *     When "viewer" signs in to the console with password "viewer"
 *     Then the console shows the Overview screen signed in as "viewer"
 *
 *     Examples:
 *       | entra values                                 |
 *       | holds no Entra ID values                     |
 *       | holds an Entra ID tenant and client for "contoso" |
 *
 * The local environment file is `ui/.env` (a developer's checkout links it to the root `.env`); the console
 * reads it the way it does under the AppHost. The "contoso" values point at Microsoft Entra ID, so a console that
 * took any of them would never reach the demo realm's login form.
 */
import { expect, expectSignedInAs, signInThroughKeycloak, test } from './support/test';

const CONTOSO_ENV = [
  'CONSOLE_ENTRA_ISSUER_BASE_URL=https://login.microsoftonline.com',
  'CONSOLE_ENTRA_TENANT_ID=contoso',
  'CONSOLE_ENTRA_CLIENT_ID=contoso-console',
  'CONSOLE_ENTRA_CLIENT_SECRET=contoso-console-secret',
  'CONSOLE_ENTRA_SCOPES=api://contoso-ledger/accounts.read',
  '',
].join('\n');

const EXAMPLES = [
  { entraValues: 'holds no Entra ID values', envFile: '' },
  { entraValues: 'holds an Entra ID tenant and client for "contoso"', envFile: CONTOSO_ENV },
];

for (const { entraValues, envFile } of EXAMPLES) {
  test(`The demo signs in with no Entra ID registration — the local environment file ${entraValues}`, async ({ page, demoConsole }) => {
    await demoConsole.start(envFile);

    await signInThroughKeycloak(page, demoConsole.baseUrl, 'viewer', 'viewer');

    await expect(page.getByRole('heading', { level: 1, name: 'Overview', exact: true })).toBeVisible();
    await expectSignedInAs(page, 'viewer');
  });
}
