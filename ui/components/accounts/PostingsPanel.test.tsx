/**
 * DRK-1696 §5:
 *   Scenario: The posting list shows a description and no running balance
 *     Given the operator Mai is reading the postings of the account ACME-000123
 *     When she reads the column headings
 *     Then she sees a description column
 *     And she sees no running balance column
 *
 * R6 — no test asserts a running-balance column; this test asserts its absence.
 * RED today: `components/accounts/PostingsPanel.tsx` does not exist.
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { PostingsPanel, type PostingsPanelRow } from './PostingsPanel';

const ROW: PostingsPanelRow = {
  id: 'p1',
  postingNumber: 'PST0000000001',
  direction: 'Credit',
  amount: '500.00',
  currency: 'SGD',
  decimalPlaces: 2,
  category: 'Transfer',
  status: 'Posted',
  description: 'Opening deposit',
  effectiveDate: '2026-09-01',
};

describe('The posting list shows a description and no running balance', () => {
  it('shows a description column and no running balance column', () => {
    render(createElement(PostingsPanel, { rows: [ROW], from: '2026-08-01', to: '2026-09-01' }));

    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /running balance/i })).toBeNull();
  });
});
