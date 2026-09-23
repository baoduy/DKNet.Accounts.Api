import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { UserMenu } from './UserMenu';

describe('UserMenu', () => {
  it('states the provider, tenant, held and missing scopes with the consequence', async () => {
    const user = userEvent.setup();
    render(
      createElement(UserMenu, {
        name: 'Mai Nguyen',
        email: 'mai@drunkcoding.net',
        tenant: 'Drunk Coding',
        objectId: '11111111-1111-4111-8111-111111111111',
        scopes: ['accounts.read', 'postings.read'],
        missingScopes: ['postings.reverse'],
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Account menu' }));

    expect(screen.getByText('Microsoft Entra ID')).toBeInTheDocument();
    expect(screen.getByText('Drunk Coding')).toBeInTheDocument();
    expect(screen.getByText('accounts.read')).toBeInTheDocument();
    expect(screen.getByText('postings.read')).toBeInTheDocument();
    expect(screen.getByText('postings.reverse')).toBeInTheDocument();
    expect(screen.getByText(/without this permission/i)).toBeInTheDocument();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('states no missing scopes when the token carries them all', async () => {
    const user = userEvent.setup();
    render(createElement(UserMenu, { name: 'Mai Nguyen', scopes: ['accounts.read'], missingScopes: [] }));
    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.queryByText(/without this permission/i)).toBeNull();
  });

  it('falls back to "Not stated." when no tenant is known', async () => {
    const user = userEvent.setup();
    render(createElement(UserMenu, { name: 'Mai Nguyen' }));
    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByText('Not stated.')).toBeInTheDocument();
  });

  it('submits a POST /signout form for the sign-out button (no client JS required)', async () => {
    const user = userEvent.setup();
    render(createElement(UserMenu, { name: 'Mai Nguyen' }));
    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    const form = screen.getByRole('button', { name: /Sign out/ }).closest('form');
    expect(form).toHaveAttribute('action', '/signout');
    expect(form).toHaveAttribute('method', 'post');
  });
});
