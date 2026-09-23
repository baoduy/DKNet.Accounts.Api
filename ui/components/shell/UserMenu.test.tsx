import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { UserMenu } from './UserMenu';

describe('UserMenu', () => {
  it('states the provider, tenant, held and missing scopes with the consequence', () => {
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

    expect(screen.getByRole('button', { name: 'Account menu' })).toBeInTheDocument();
    expect(screen.getByText('Microsoft Entra ID')).toBeInTheDocument();
    expect(screen.getByText('Drunk Coding')).toBeInTheDocument();
    expect(screen.getByText('accounts.read')).toBeInTheDocument();
    expect(screen.getByText('postings.read')).toBeInTheDocument();
    expect(screen.getByText('postings.reverse')).toBeInTheDocument();
    expect(screen.getByText(/without this permission/i)).toBeInTheDocument();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('addresses the operator directly, never the test persona, beside a missing scope (pr-reviewer finding 5, DRK-1687)', () => {
    render(createElement(UserMenu, { name: 'Nam Tran', scopes: ['accounts.read'], missingScopes: ['postings.reverse'] }));
    expect(screen.getByText('You cannot reverse a posting without this permission.')).toBeInTheDocument();
    expect(screen.queryByText(/Nam Tran cannot|Mai cannot/)).toBeNull();
  });

  it('falls back to "do this" for a missing scope with no known consequence', () => {
    render(createElement(UserMenu, { name: 'Mai Nguyen', scopes: [], missingScopes: ['unknown.scope'] }));
    expect(screen.getByText('You cannot do this without this permission.')).toBeInTheDocument();
  });

  it('states no missing scopes when the token carries them all', () => {
    render(createElement(UserMenu, { name: 'Mai Nguyen', scopes: ['accounts.read'], missingScopes: [] }));
    expect(screen.queryByText(/without this permission/i)).toBeNull();
  });

  it('falls back to "Not stated." when no tenant is known', () => {
    render(createElement(UserMenu, { name: 'Mai Nguyen' }));
    expect(screen.getByText('Not stated.')).toBeInTheDocument();
  });

  it('submits a POST /signout form for the sign-out button (no client JS required)', () => {
    render(createElement(UserMenu, { name: 'Mai Nguyen' }));
    const form = screen.getByRole('button', { name: /Sign out/ }).closest('form');
    expect(form).toHaveAttribute('action', '/signout');
    expect(form).toHaveAttribute('method', 'post');
  });

  it('opens on a native disclosure element, not a JS-only trigger — the panel is in the DOM before any click', () => {
    const { container } = render(createElement(UserMenu, { name: 'Mai Nguyen' }));
    // A JS-driven menu (Radix or a useState toggle) would mount `role="menu"` only after
    // an open state flips — a `<details>` never needs that: this assertion alone would go
    // red the moment the trigger stopped being native, unclicked, before hydration ever runs.
    expect(container.querySelector('details')).not.toBeNull();
    expect(container.querySelector('details > summary[role="button"]')).not.toBeNull();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
