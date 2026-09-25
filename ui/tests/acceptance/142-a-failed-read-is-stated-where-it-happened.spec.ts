/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario Outline: A failed read is stated where it happened
 *     Given the service <failure> for the <content>
 *     When the operator Mai opens the <screen>
 *     Then she reads <statement> in place of the <content>, with a way to try again
 *     And the rest of the screen stays usable
 *
 *     Examples:
 *       | screen                       | content              | failure                                              | statement                                          |
 *       | Overview screen              | position by currency | cannot be reached                                    | that the service cannot be reached                 |
 *       | Accounts screen              | account list         | answers "Ledger store unavailable" with no code      | "Ledger store unavailable"                         |
 *       | detail screen of ACME-000123 | statement            | cannot be reached                                    | that the service cannot be reached                 |
 *       | Records screen               | posting list         | answers "The period is too wide" with the code INVALID_DATE_RANGE | "The period is too wide" and INVALID_DATE_RANGE |
 *       | Account groups screen        | group list           | answers "Ledger store unavailable" with no code      | "Ledger store unavailable"                         |
 *       | Currencies screen            | currency list        | cannot be reached                                    | that the service cannot be reached                 |
 *
 * The failure happens at the stand-in ledger, behind the console's own pass-through: "cannot be
 * reached" drops the connection with no answer; the others answer with the service's refusal
 * body. "A way to try again" is proven by trying again once the service answers. The statement
 * for an unreachable service is the brief's (§3 row 6): `The ledger service cannot be reached.`
 *
 * RED today: the pass-through lets an unreachable service surface as the framework's own error
 * page, which the screens read as a parse error; no failure offers `Retry`; a refusal is drawn
 * with no `alert` role.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { clearLedgerFailures, failLedgerRead, type LedgerFailure } from '../support/ledger';
import { panel } from '../support/overview';
import { expectSearchUsable, screenNamed, seedPopulatedLedger, type ScreenUnderTest } from '../support/screen-states';
import { signInAs } from '../support/sign-in';
import type { Locator, Page } from '@playwright/test';

const UNREACHABLE = 'The ledger service cannot be reached.';

interface FailedReadExample {
  screen: ScreenUnderTest['name'];
  content: string;
  /** The service's own paths the content is read from. */
  paths: string[];
  failure: LedgerFailure;
  /** The service's wording the operator reads, and its code when one came. */
  statement: string;
  code?: string;
  /** Where the content is drawn. */
  place: (page: Page) => Locator;
  /** What else on the screen must still work. */
  rest: (page: Page) => Locator[];
}

const EXAMPLES: FailedReadExample[] = [
  {
    screen: 'Overview screen',
    content: 'position by currency',
    paths: ['/v1/accounts/balances'],
    failure: { unreachable: true },
    statement: UNREACHABLE,
    place: (page) => panel(page, 'Position by currency'),
    rest: (page) => [panel(page, 'Accounts by status').getByRole('table'), panel(page, 'Groups by status').getByRole('table')],
  },
  {
    screen: 'Accounts screen',
    content: 'account list',
    paths: ['/v1/accounts'],
    failure: { status: 503, message: 'Ledger store unavailable' },
    statement: 'Ledger store unavailable',
    place: (page) => page.getByRole('main'),
    rest: (page) => [page.getByLabel('Search accounts', { exact: true }), page.getByRole('button', { name: 'Open account', exact: true })],
  },
  {
    screen: 'detail screen of ACME-000123',
    content: 'statement',
    paths: ['/v1/postings', '/v1/accounts/[^/]+/statement'],
    failure: { unreachable: true },
    statement: UNREACHABLE,
    place: (page) => page.getByTestId('postings-panel'),
    rest: (page) => [page.getByTestId('account-balance'), page.getByTestId('postings-panel').getByLabel('From', { exact: true })],
  },
  {
    screen: 'Records screen',
    content: 'posting list',
    paths: ['/v1/postings'],
    failure: { status: 422, message: 'The period is too wide', code: 'INVALID_DATE_RANGE' },
    statement: 'The period is too wide',
    code: 'INVALID_DATE_RANGE',
    place: (page) => page.getByRole('main'),
    rest: (page) => [page.getByLabel('From', { exact: true }), page.getByLabel('Category filter', { exact: true })],
  },
  {
    screen: 'Account groups screen',
    content: 'group list',
    paths: ['/v1/account-groups'],
    failure: { status: 503, message: 'Ledger store unavailable' },
    statement: 'Ledger store unavailable',
    place: (page) => page.getByRole('main'),
    rest: (page) => [page.getByRole('button', { name: 'New group', exact: true }), page.getByLabel('Status filter', { exact: true })],
  },
  {
    screen: 'Currencies screen',
    content: 'currency list',
    paths: ['/v1/currencies'],
    failure: { unreachable: true },
    statement: UNREACHABLE,
    place: (page) => page.getByRole('main'),
    rest: (page) => [page.getByRole('button', { name: 'New currency', exact: true })],
  },
];

for (const example of EXAMPLES) {
  test(`A failed read is stated where it happened — ${example.screen}: the ${example.content}`, async ({ page, baseURL }) => {
    // DRK-1745: rewrite for the new form
    test.fixme(example.screen === 'Account groups screen', 'DRK-1745: rewrite for the new form');
    const screen = screenNamed(example.screen);
    await seedPopulatedLedger();
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
    for (const path of example.paths) await failLedgerRead(path, example.failure);

    await page.goto(`${baseURL}${screen.path}`);

    // Stated in place of the content: where it would be drawn, and the content is not.
    const alert = example.place(page).getByRole('alert');
    await expect(alert).toHaveCount(1);
    if (example.code) {
      await expect(alert).toContainText(example.statement);
      await expect(alert.getByText(example.code, { exact: true })).toBeVisible();
    } else {
      await expect(alert.getByText(example.statement, { exact: true })).toBeVisible();
      // The service sent no code, so none is shown (spec 29).
      await expect(alert).not.toContainText(/\b[A-Z]+(?:_[A-Z]+)+\b/);
    }
    await expect(screen.ready(page)).toHaveCount(0);

    // The rest of the screen stays usable.
    for (const control of example.rest(page)) {
      await expect(control).toBeVisible();
      await expect(control).toBeEnabled();
    }
    await expectSearchUsable(page);

    // With a way to try again.
    await clearLedgerFailures();
    await alert.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(screen.ready(page)).toBeVisible();
    await expect(example.place(page).getByRole('alert')).toHaveCount(0);
  });
}
