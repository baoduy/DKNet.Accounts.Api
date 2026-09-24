import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { CONSOLE_NAV, Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('renders the LEDGER section at the top and ADMINISTRATION at the foot', () => {
    render(createElement(Sidebar, {}));
    const nav = screen.getByRole('navigation');
    const titles = [...nav.querySelectorAll('div')].map((el) => el.textContent).filter((t) => t === 'LEDGER' || t === 'ADMINISTRATION');
    expect(titles[0]).toBe('LEDGER');
    expect(titles.at(-1)).toBe('ADMINISTRATION');
  });

  it('renders every configured nav entry as a link', () => {
    render(createElement(Sidebar, {}));
    for (const section of CONSOLE_NAV) {
      for (const item of section.items) {
        expect(screen.getByRole('link', { name: new RegExp(item.label) })).toHaveAttribute('href', item.href);
      }
    }
  });

  it('marks the active entry and calls onNavigate instead of following the href', () => {
    let navigated: string | undefined;
    render(createElement(Sidebar, { active: 'accounts', onNavigate: (item) => (navigated = item.id) }));
    screen.getByRole('link', { name: /Accounts/ }).click();
    expect(navigated).toBe('accounts');
  });

  it('offers Records at /records, marked current on that screen, and no Record posting entry (DRK-1713 §3 row 9)', () => {
    render(createElement(Sidebar, { active: 'records' }));
    const records = screen.getByRole('link', { name: 'Records' });
    expect(records).toHaveAttribute('href', '/records');
    expect(records).toHaveAttribute('aria-current', 'page');
    expect(records.querySelector('svg')).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'Record posting' })).toBeNull();
  });
});
