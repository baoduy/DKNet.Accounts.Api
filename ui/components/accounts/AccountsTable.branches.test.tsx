/**
 * DRK-1704 finding 12 — mutation-coverage companion to the frozen `AccountsTable.test.tsx`.
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { AccountsTable } from './AccountsTable';

describe('AccountsTable — the default empty message', () => {
  it('shows "No accounts found." when there are no rows', () => {
    render(createElement(AccountsTable, { rows: [] }));
    expect(screen.getByText('No accounts found.')).toBeInTheDocument();
  });
});
