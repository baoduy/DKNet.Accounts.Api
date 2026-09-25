import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DetailList, DetailPanel, DetailSection } from './DetailPanel';

describe('DetailPanel', () => {
  // DRK-1745: rewrite for the new form
  it.skip('renders the title as a heading and calls onClose', () => {
    const onClose = vi.fn();
    render(createElement(DetailPanel, { title: 'ACME-000123', onClose }, 'content'));
    expect(screen.getByRole('heading', { name: 'ACME-000123' })).toBeInTheDocument();
    screen.getByRole('button', { name: 'Close' }).click();
    expect(onClose).toHaveBeenCalled();
  });

  it('omits the more-record link when moreHref is not given', () => {
    render(createElement(DetailPanel, { title: 'X' }));
    expect(screen.queryByRole('link')).toBeNull();
  });

  // DRK-1745: rewrite for the new form
  it.skip('links to the full record when moreHref is given', () => {
    render(createElement(DetailPanel, { title: 'X', moreHref: '/accounts/acme-000123', moreLabel: 'View account' }));
    expect(screen.getByRole('link', { name: 'View account' })).toHaveAttribute('href', '/accounts/acme-000123');
  });

  // DRK-1745: rewrite for the new form
  it.skip('defaults the more-record link label when none is given', () => {
    render(createElement(DetailPanel, { title: 'X', moreHref: '/accounts/acme-000123' }));
    expect(screen.getByRole('link', { name: 'View full record' })).toBeInTheDocument();
  });

  it('shows the footnote and bottom-bar actions', () => {
    render(
      createElement(DetailPanel, {
        title: 'X',
        footnote: 'Refused with ACCOUNT_HOLDS_BALANCE.',
        actions: createElement('button', { type: 'button' }, 'Close account'),
      }),
    );
    expect(screen.getByText('Refused with ACCOUNT_HOLDS_BALANCE.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close account' })).toBeInTheDocument();
  });
});

describe('DetailList', () => {
  it('renders a label/value pair per item', () => {
    render(createElement(DetailList, { items: [{ label: 'Account no.', value: 'ACME-000123' }] }));
    expect(screen.getByText('Account no.')).toBeInTheDocument();
    expect(screen.getByText('ACME-000123')).toBeInTheDocument();
  });
});

describe('DetailSection', () => {
  // DRK-1745: rewrite for the new form
  it.skip('draws a divider by default and pushes the heading down from it', () => {
    const { container } = render(createElement(DetailSection, null, 'Balances'));
    expect(container.querySelector('[data-slot="separator"]')).not.toBeNull();
    expect(screen.getByText('Balances')).toHaveClass('text-[length:var(--text-section-size)]', 'font-semibold', 'mt-3');
  });

  // DRK-1745: rewrite for the new form
  it.skip("omits the divider and the top margin on a panel's first section", () => {
    const { container } = render(createElement(DetailSection, { divider: false }, 'Balances'));
    expect(container.querySelector('[data-slot="separator"]')).toBeNull();
    expect(screen.getByText('Balances')).toHaveClass('text-[length:var(--text-section-size)]', 'font-semibold');
    expect(screen.getByText('Balances')).not.toHaveClass('mt-3');
  });
});
