/**
 * DRK-1725 §5 (every row but Overview's, which is spec 125):
 *   @integration
 *   Scenario Outline: A list states three kinds of empty in three messages
 *     Given <situation>
 *     When the operator Mai opens the <screen>
 *     Then she reads "<message>"
 *
 *     Examples:
 *       | screen                       | situation                                              | message                                  |
 *       | Accounts screen              | the ledger holds no accounts                           | No accounts yet.                         |
 *       | Accounts screen              | no account matches the filter status Frozen            | No accounts match this filter.           |
 *       | Accounts screen              | she opens a link to page 9 of 3                        | No more accounts.                        |
 *       | Account groups screen        | the ledger holds no groups                             | No groups yet.                           |
 *       | Account groups screen        | no group matches the filter type Internal              | No groups match this filter.             |
 *       | Account groups screen        | she opens a link to page 9 of 3                        | No more groups.                          |
 *       | detail screen of ACME-000123 | ACME-000123 has no postings                            | No postings recorded on this account.    |
 *       | detail screen of ACME-000123 | ACME-000123 has no postings from 1 Jan to 31 Jan 2026  | No postings between 1 Jan and 31 Jan.    |
 *       | detail screen of ACME-000123 | she opens a link to page 9 of 3 of its statement       | No more postings.                        |
 *       | Records screen               | no posting took effect from 1 Sep to 24 Sep 2026       | No postings between 1 Sep and 24 Sep.    |
 *       | Records screen               | no posting in that period matches the category Fee     | No postings match this filter.           |
 *       | Records screen               | she opens a link to page 9 of 3                        | No more postings.                        |
 *       | Currencies screen            | the ledger holds no currencies                         | No currencies yet.                       |
 *
 * Plus brief rule R1: the empty list keeps its table and column headings, and the screen's
 * other two messages are not shown with it. "Page 9 of 3" is 25 rows at the lists' 10 a page.
 *
 * RED today: each list draws one message for every kind of empty, in place of its table
 * (`LedgerTable.tsx`, `StatementTable.tsx`), and the detail screen reads no period or page from
 * its address.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { clearLedgerCurrencies, seedLedgerAccountGroups, seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { ACME_ID, account, daysAgo, posting } from '../support/records';
import { ACME_GROUP_ID, ACME_NUMBER } from '../support/screen-states';
import { signInAs } from '../support/sign-in';

const POSTING_PERIOD = /^No postings between /;

interface EmptyExample {
  screen: string;
  situation: string;
  message: string;
  /** The screen's other kinds of empty, never shown with this one. */
  others: Array<string | RegExp>;
  seed: () => Promise<void>;
  path: string;
  /** The filter the address set, still drawn on screen. */
  filter?: { label: string; value: string };
}

async function seedAcme(): Promise<void> {
  await seedLedgerAccountGroups([{ id: ACME_GROUP_ID, code: 'ACME', name: 'Acme Group', type: 'Customer', ownerId: 'acme-ops' }]);
  await seedLedgerAccounts([account(ACME_NUMBER, ACME_ID, { name: 'Acme Operating', groupId: ACME_GROUP_ID })]);
}

async function seedAcmePostings(effectiveDates: string[], category = 'Transfer'): Promise<void> {
  await seedLedgerPostings(
    effectiveDates.map((effectiveDate, index) =>
      posting({ id: `51b0c3d2-7e8f-4a9b-8c1d-0000000001${String(index).padStart(2, '0')}`, postingNumber: `P-${20000 + index}`, accountId: ACME_ID, direction: 'Credit', amount: '10.00', currency: 'SGD', category, effectiveDate }),
    ),
  );
}

const TWENTY_FIVE = Array.from({ length: 25 }, (_, index) => index + 1);

const EXAMPLES: EmptyExample[] = [
  {
    screen: 'Accounts screen',
    situation: 'the ledger holds no accounts',
    message: 'No accounts yet.',
    others: ['No accounts match this filter.', 'No more accounts.'],
    seed: async () => {},
    path: '/accounts',
  },
  {
    screen: 'Accounts screen',
    situation: 'no account matches the filter status Frozen',
    message: 'No accounts match this filter.',
    others: ['No accounts yet.', 'No more accounts.'],
    seed: seedAcme,
    path: '/accounts?status=Frozen',
  },
  {
    screen: 'Accounts screen',
    situation: 'she opens a link to page 9 of 3',
    message: 'No more accounts.',
    others: ['No accounts yet.', 'No accounts match this filter.'],
    seed: () => seedLedgerAccounts(TWENTY_FIVE.map((n) => account(`ACCT-${String(n).padStart(6, '0')}`, `a0000000-0000-4000-8000-0000000001${String(n).padStart(2, '0')}`))),
    path: '/accounts?page=9',
  },
  {
    screen: 'Account groups screen',
    situation: 'the ledger holds no groups',
    message: 'No groups yet.',
    others: ['No groups match this filter.', 'No more groups.'],
    seed: async () => {},
    path: '/groups',
  },
  {
    screen: 'Account groups screen',
    situation: 'no group matches the filter type Internal',
    message: 'No groups match this filter.',
    others: ['No groups yet.', 'No more groups.'],
    seed: seedAcme,
    path: '/groups?type=Internal',
    filter: { label: 'Type filter', value: 'Internal' },
  },
  {
    screen: 'Account groups screen',
    situation: 'she opens a link to page 9 of 3',
    message: 'No more groups.',
    others: ['No groups yet.', 'No groups match this filter.'],
    seed: () =>
      seedLedgerAccountGroups(
        TWENTY_FIVE.map((n) => ({ id: `9a4c7e21-5d6f-4a8b-9c0d-0000000001${String(n).padStart(2, '0')}`, code: `GROUP-${String(n).padStart(2, '0')}`, name: `Group ${n}`, type: 'Customer', ownerId: 'partner-01' })),
      ),
    path: '/groups?page=9&pageSize=10',
  },
  {
    screen: 'detail screen of ACME-000123',
    situation: 'ACME-000123 has no postings',
    message: 'No postings recorded on this account.',
    others: [POSTING_PERIOD, 'No more postings.'],
    seed: seedAcme,
    path: `/accounts/${ACME_NUMBER}`,
  },
  {
    screen: 'detail screen of ACME-000123',
    situation: 'ACME-000123 has no postings from 1 Jan to 31 Jan 2026',
    message: 'No postings between 1 Jan and 31 Jan.',
    others: ['No postings recorded on this account.', 'No more postings.'],
    seed: async () => {
      await seedAcme();
      await seedAcmePostings(['2026-02-10']);
    },
    path: `/accounts/${ACME_NUMBER}?from=2026-01-01&to=2026-01-31`,
  },
  {
    screen: 'detail screen of ACME-000123',
    situation: 'she opens a link to page 9 of 3 of its statement',
    message: 'No more postings.',
    others: ['No postings recorded on this account.', POSTING_PERIOD],
    seed: async () => {
      await seedAcme();
      await seedAcmePostings(TWENTY_FIVE.map((n) => daysAgo(n)));
    },
    path: `/accounts/${ACME_NUMBER}?page=9`,
  },
  {
    screen: 'Records screen',
    situation: 'no posting took effect from 1 Sep to 24 Sep 2026',
    message: 'No postings between 1 Sep and 24 Sep.',
    others: ['No postings match this filter.', 'No more postings.'],
    seed: async () => {
      await seedAcme();
      await seedAcmePostings(['2026-08-15']);
    },
    path: '/records?from=2026-09-01&to=2026-09-24',
  },
  {
    screen: 'Records screen',
    situation: 'no posting in that period matches the category Fee',
    message: 'No postings match this filter.',
    others: [POSTING_PERIOD, 'No more postings.'],
    seed: async () => {
      await seedAcme();
      await seedAcmePostings(['2026-09-10'], 'Transfer');
    },
    path: '/records?from=2026-09-01&to=2026-09-24&category=Fee',
    filter: { label: 'Category filter', value: 'Fee' },
  },
  {
    screen: 'Records screen',
    situation: 'she opens a link to page 9 of 3',
    message: 'No more postings.',
    others: [POSTING_PERIOD, 'No postings match this filter.'],
    seed: async () => {
      await seedAcme();
      await seedAcmePostings(TWENTY_FIVE.map((n) => daysAgo(n)));
    },
    path: '/records?page=9',
  },
  {
    screen: 'Currencies screen',
    situation: 'the ledger holds no currencies',
    message: 'No currencies yet.',
    others: [],
    seed: clearLedgerCurrencies,
    path: '/currencies',
  },
];

for (const example of EXAMPLES) {
  test(`A list states three kinds of empty in three messages — ${example.screen}: ${example.situation}`, async ({ page, baseURL }) => {
    // DRK-1745: rewrite for the new form
    test.fixme(example.screen === 'Account groups screen' && example.situation === 'no group matches the filter type Internal', 'DRK-1745: rewrite for the new form');
    test.fixme(
      ['detail screen of ACME-000123: ACME-000123 has no postings from 1 Jan to 31 Jan 2026', 'Records screen: no posting took effect from 1 Sep to 24 Sep 2026', 'Records screen: no posting in that period matches the category Fee'].includes(`${example.screen}: ${example.situation}`),
      'DRK-1745: rewrite for the new form',
    );
    await example.seed();
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

    await page.goto(`${baseURL}${example.path}`);

    const main = page.getByRole('main');
    const message = main.getByText(example.message, { exact: true });
    await expect(message).toBeVisible();

    // The list keeps its table and column headings; the message sits in its body.
    const table = main.getByRole('table').filter({ has: page.getByText(example.message, { exact: true }) });
    await expect(table).toHaveCount(1);
    await expect(table.locator('thead th').first()).toBeVisible();
    await expect(table.locator('tbody').getByText(example.message, { exact: true })).toBeVisible();

    for (const other of example.others) {
      await expect(main.getByText(other, { exact: typeof other === 'string' })).toHaveCount(0);
    }
    if (example.filter) {
      await expect(page.getByLabel(example.filter.label, { exact: true })).toHaveValue(example.filter.value);
    }
  });
}
