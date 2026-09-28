import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { DetailList, DetailPanel } from './DetailPanel';

describe('DetailPanel', () => {

  it('omits the more-record link when moreHref is not given', () => {
    render(createElement(DetailPanel, { title: 'X' }));
    expect(screen.queryByRole('link')).toBeNull();
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
