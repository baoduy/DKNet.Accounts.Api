/**
 * DRK-2325 §5 — the console's menu with the Transfers entry:
 *
 *   @unit Scenario: The Transfers entry sits under LEDGER after Records          (@new — the menu half;
 *         the page trail half is `tests/unit/transfers-page-trail.test.tsx`)
 *   @unit Scenario Outline: Each existing menu entry still opens its own screen  (@existing)
 *
 * RED today on the first: `CONSOLE_NAV`'s LEDGER section ends at Records (brief §3 row 8).
 */
import { render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Sidebar } from './Sidebar';

/** The links listed under a section title, in the order they are drawn. */
function linksUnder(title: string): HTMLAnchorElement[] {
  const heading = within(screen.getByRole('navigation')).getByText(title, { exact: true });
  return [...heading.parentElement!.querySelectorAll('a')];
}

describe('The Transfers entry sits under LEDGER after Records', () => {
  it('lists Overview, Accounts, Records and Transfers under LEDGER, in that order, Transfers opening /transfers', () => {
    render(createElement(Sidebar, {}));

    const ledger = linksUnder('LEDGER');
    expect(ledger.map((link) => link.textContent)).toEqual(['Overview', 'Accounts', 'Records', 'Transfers']);
    expect(ledger[3]).toHaveAttribute('href', '/transfers');
  });

  it('still lists Account groups and Currencies under ADMINISTRATION', () => {
    render(createElement(Sidebar, {}));

    expect(linksUnder('ADMINISTRATION').map((link) => link.textContent)).toEqual(['Account groups', 'Currencies']);
  });

  it('marks Transfers as the current entry on the Transfers screen', () => {
    render(createElement(Sidebar, { active: 'transfers' }));

    expect(screen.getByRole('link', { name: 'Transfers' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Records' })).not.toHaveAttribute('aria-current');
  });
});

describe('Each existing menu entry still opens its own screen', () => {
  it.each([
    { entry: 'Overview', id: 'overview', href: '/' },
    { entry: 'Accounts', id: 'accounts', href: '/accounts' },
    { entry: 'Records', id: 'records', href: '/records' },
    { entry: 'Account groups', id: 'groups', href: '/groups' },
    { entry: 'Currencies', id: 'currencies', href: '/currencies' },
  ])('$entry opens $href, marked as the current entry there', ({ entry, id, href }) => {
    render(createElement(Sidebar, { active: id }));

    const link = screen.getByRole('link', { name: entry });
    expect(link).toHaveAttribute('href', href);
    expect(link).toHaveAttribute('aria-current', 'page');
    const current = screen.getAllByRole('link').filter((candidate) => candidate.getAttribute('aria-current') === 'page');
    expect(current).toEqual([link]);
  });
});
