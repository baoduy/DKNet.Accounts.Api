/**
 * DRK-1704 finding 12 — mutation-coverage companion to the frozen `AccountsTable.test.tsx`.
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { AccountsTable } from './AccountsTable';

describe('AccountsTable — the default empty message', () => {
  // DRK-1745: rewrite for the new form
  it.skip('shows "No accounts yet." in a full-width row under its headings when there are no rows', () => {
    render(createElement(AccountsTable, { rows: [] }));
    expect(screen.getByRole('cell', { name: 'No accounts yet.' })).toHaveAttribute('colspan', '7');
    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
  });
});
