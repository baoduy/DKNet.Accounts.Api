import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Id } from './id';

describe('Id', () => {
  it('renders a plain value as monospaced text with no link', () => {
    render(createElement(Id, { value: 'acc_01HZ' }));
    expect(screen.getByText('acc_01HZ')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders as a link when href is given', () => {
    render(createElement(Id, { value: 'acc_01HZ', href: '/accounts/acc_01HZ' }));
    expect(screen.getByRole('link', { name: 'acc_01HZ' })).toHaveAttribute('href', '/accounts/acc_01HZ');
  });

  it('calls onNavigate with the value and never follows the href', () => {
    let navigated: string | undefined;
    render(createElement(Id, { value: 'acc_01HZ', href: '/accounts/acc_01HZ', onNavigate: (v) => (navigated = v) }));
    screen.getByRole('link', { name: 'acc_01HZ' }).click();
    expect(navigated).toBe('acc_01HZ');
  });
});
