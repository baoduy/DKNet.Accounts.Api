import { expect, type Locator, type Page } from '@playwright/test';
import { seedLedgerAccountGroups, seedLedgerAccounts, seedLedgerPostings } from './ledger';
import { panel, searchField } from './overview';
import { ACME_ID, account, daysAgo, posting } from './records';

/**
 * DRK-1729 — how the acceptance specs 140 to 146 drive the 6 console screens' empty, loading and
 * failed states, their keyboard use and their contrast (DRK-1725 §3 "Every screen — …"). The
 * names below are the screens' contract with these specs:
 *
 * - empty: a list that holds nothing keeps its table and column headings and states why in a
 *   full-width body row — one of 3 messages (nothing yet, nothing matching the filter or period,
 *   past the last page), exact texts per the spec's table.
 * - addresses: every list's filter, period and page are in its address — `/accounts?status=…`,
 *   `/accounts?page=…`, `/groups?type=…`, `/groups?page=…&pageSize=…`, `/records?from=…&to=…`,
 *   `/records?category=…`, `/records?page=…`, and the detail screen's statement
 *   `/accounts/<number>?from=…&to=…` and `?page=…`. The groups screen has a `Type filter` select
 *   beside its `Status filter`.
 * - loading: placeholders are the console's `Skeleton` (`data-slot="skeleton"`), static; a table
 *   keeps its column headings and shows placeholder rows; nothing in `main` animates, and no
 *   `Loading…` line or progress indicator stands in for content.
 * - failed read: drawn as a `role="alert"` block where the content would be — inside that
 *   content's own region on Overview, inside `data-testid="postings-panel"` for the detail
 *   screen's statement, in `main` in place of the list's table elsewhere. It carries the
 *   service's message, its code when one came, and a `Retry` button. A service that cannot be
 *   reached reads `The ledger service cannot be reached.`
 * - keyboard: a list row that opens something is a tab stop and Enter opens it — the row then
 *   carries `data-state="selected"`, the tables' existing selection mark.
 */

/** DRK-1725 §5 literals. */
export const ACME_NUMBER = 'ACME-000123';
export const ACME_GROUP_ID = '9a4c7e21-5d6f-4a8b-9c0d-1e2f3a4b5c6d';
export const FIRST_POSTING = 'P-10042';

export interface ScreenUnderTest {
  name: 'Overview screen' | 'Accounts screen' | 'detail screen of ACME-000123' | 'Records screen' | 'Account groups screen' | 'Currencies screen';
  path: string;
  /** Drawn once the screen's own data has arrived. */
  ready: (page: Page) => Locator;
  /** A list row Enter opens, when the screen has one. */
  selectableRow?: (page: Page) => Locator;
}

function mainRow(page: Page, text: string): Locator {
  return page.getByRole('main').locator('tbody tr').filter({ has: page.getByText(text, { exact: true }) }).first();
}

export const SCREENS: ScreenUnderTest[] = [
  {
    name: 'Overview screen',
    path: '/',
    ready: (page) => panel(page, 'Position by currency').getByRole('table').getByText('SGD', { exact: true }).first(),
  },
  {
    name: 'Accounts screen',
    path: '/accounts',
    ready: (page) => page.getByRole('main').getByRole('link', { name: ACME_NUMBER, exact: true }),
  },
  {
    name: 'detail screen of ACME-000123',
    path: `/accounts/${ACME_NUMBER}`,
    ready: (page) => page.getByTestId('postings-panel').getByText(FIRST_POSTING, { exact: true }),
    selectableRow: (page) => mainRow(page, FIRST_POSTING),
  },
  {
    name: 'Records screen',
    path: '/records',
    ready: (page) => page.getByRole('main').getByRole('cell', { name: FIRST_POSTING, exact: true }),
    selectableRow: (page) => mainRow(page, FIRST_POSTING),
  },
  {
    name: 'Account groups screen',
    path: '/groups',
    ready: (page) => page.getByRole('main').getByRole('cell', { name: 'ACME', exact: true }),
    selectableRow: (page) => mainRow(page, 'ACME'),
  },
  {
    name: 'Currencies screen',
    path: '/currencies',
    ready: (page) => page.getByRole('main').getByRole('cell', { name: 'SGD', exact: true }),
    selectableRow: (page) => mainRow(page, 'SGD'),
  },
];

export function screenNamed(name: ScreenUnderTest['name']): ScreenUnderTest {
  const screen = SCREENS.find((candidate) => candidate.name === name);
  if (!screen) throw new Error(`no screen ${name}`);
  return screen;
}

/**
 * The ledger every screen draws in full: one page (10 rows, the lists' page size) of accounts,
 * of groups and of ACME-000123's postings in the last 30 days — so a list's placeholders and its
 * data fill the same page.
 */
export async function seedPopulatedLedger(): Promise<void> {
  await seedLedgerAccountGroups(
    Array.from({ length: 10 }, (_, index) =>
      index === 0
        ? { id: ACME_GROUP_ID, code: 'ACME', name: 'Acme Group', type: 'Customer', ownerId: 'acme-ops' }
        : { id: `9a4c7e21-5d6f-4a8b-9c0d-00000000000${index}`, code: `GROUP-0${index}`, name: `Group ${index}`, type: 'Merchant', ownerId: 'partner-01' },
    ),
  );
  await seedLedgerAccounts(
    Array.from({ length: 10 }, (_, index) =>
      index === 0
        ? account(ACME_NUMBER, ACME_ID, { name: 'Acme Operating', groupId: ACME_GROUP_ID })
        : account(`ACCT-00000${index}`, `a0000000-0000-4000-8000-00000000000${index}`, { name: `Account ${index}`, groupId: ACME_GROUP_ID }),
    ),
  );
  await seedLedgerPostings(
    Array.from({ length: 10 }, (_, index) =>
      posting({
        id: `51b0c3d2-7e8f-4a9b-8c1d-00000000000${index}`,
        postingNumber: `P-${10042 + index}`,
        accountId: ACME_ID,
        direction: 'Credit',
        amount: '10.00',
        currency: 'SGD',
        category: 'Transfer',
        effectiveDate: daysAgo(index + 1),
      }),
    ),
  );
}

/**
 * "The service is slow to answer": every ledger read the browser makes waits until the returned
 * function is called. Requests sent after that pass straight through.
 */
export async function holdLedgerReads(page: Page): Promise<() => void> {
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/ledger/**', async (route) => {
    await released;
    await route.continue();
  });
  return release;
}

export interface Placed {
  key: string;
  x: number;
  y: number;
  /** A column heading in a table head. */
  columnHeading: boolean;
}

/**
 * Where every heading, column heading, label, control, link and region on the page sits, keyed
 * by its tag, its accessible name or text, and its place among same-keyed elements.
 */
export async function layoutOf(page: Page): Promise<Placed[]> {
  return page.evaluate(() => {
    const selector = 'h1, h2, h3, th, label, button, a[href], input, select, textarea, [role="region"], [role="searchbox"]';
    const counts = new Map<string, number>();
    const placed: Array<{ key: string; x: number; y: number; columnHeading: boolean }> = [];
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      if (!element.checkVisibility()) continue;
      const box = element.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      const labelledBy = element.getAttribute('aria-labelledby');
      const name = (element.getAttribute('aria-label') ?? (labelledBy ? document.getElementById(labelledBy)?.textContent : null) ?? element.textContent ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60);
      const base = `${element.tagName.toLowerCase()} "${name}"`;
      const occurrence = (counts.get(base) ?? 0) + 1;
      counts.set(base, occurrence);
      placed.push({ key: `${base} #${occurrence}`, x: Math.round(box.left + window.scrollX), y: Math.round(box.top + window.scrollY), columnHeading: element.tagName === 'TH' && element.closest('thead') !== null });
    }
    return placed;
  });
}

/** Every element placed both times that moved by more than a pixel, and every column heading the
 * final layout draws that the loading layout did not draw at the same place. */
export function movedBetween(before: Placed[], after: Placed[]): string[] {
  const earlier = new Map(before.map((item) => [item.key, item]));
  const moved: string[] = [];
  for (const item of after) {
    const was = earlier.get(item.key);
    if (!was) {
      if (item.columnHeading) moved.push(`${item.key} was not drawn while loading`);
      continue;
    }
    if (Math.abs(was.x - item.x) > 1 || Math.abs(was.y - item.y) > 1) moved.push(`${item.key} moved from (${was.x}, ${was.y}) to (${item.x}, ${item.y})`);
  }
  return moved;
}

/** No spinner, no animation and no loading line in `main`; every table keeps its column headings
 * and shows placeholder rows. */
export async function expectPlaceholdersOnly(page: Page): Promise<void> {
  const main = page.getByRole('main');
  await expect(main.locator('[data-slot="skeleton"]').first()).toBeVisible();
  await expect(main.getByRole('progressbar')).toHaveCount(0);
  await expect(main.getByText(/^Loading/)).toHaveCount(0);
  const running = await main.evaluate((element) =>
    element
      .getAnimations({ subtree: true })
      .filter((animation) => animation.playState === 'running')
      .map((animation) => {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        return `${target?.tagName.toLowerCase() ?? '?'}.${target?.getAttribute('class') ?? ''}`;
      }),
  );
  expect(running, 'animations running in main while loading').toEqual([]);
  for (const table of await main.getByRole('table').all()) {
    await expect(table.locator('thead th').first()).toBeVisible();
    const rows = await table.locator('tbody tr').all();
    expect(rows.length, 'placeholder rows in a loading table').toBeGreaterThan(0);
    for (const row of rows) await expect(row.locator('[data-slot="skeleton"]').first()).toBeVisible();
  }
}

/** The top bar's (Overview: the page's) search still takes typing. */
export async function expectSearchUsable(page: Page): Promise<void> {
  const field = searchField(page);
  await expect(field).toBeEditable();
  await field.fill('acme');
  await expect(field).toHaveValue('acme');
}
