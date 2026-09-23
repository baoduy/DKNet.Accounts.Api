/**
 * DRK-1679 §5:
 *   Scenario: The statement stays in the order the service sent it
 *     Given the operator Mai is reading the statement of the account ACME-000123
 *     When she chooses a column heading
 *     Then the rows stay in the order the service sent them
 *     And no column offers to sort
 *
 * Column sorting is off on this table entirely (StatementTable.d.ts) — there is no
 * `onSort` prop to wire, unlike `LedgerTable`.
 */
import { render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { StatementTable } from './StatementTable';
import type { StatementRowShape } from './StatementTable';

const ROWS: StatementRowShape[] = [
  {
    id: 'p3',
    effectiveDate: '2026-09-03',
    recordedAt: '2026-09-03T10:00:00Z',
    postingNumber: 'PST-000003',
    description: 'Third posted, smallest amount',
    signedAmount: '10.00',
    balanceAfter: '12410.00',
    streamPosition: 3,
  },
  {
    id: 'p1',
    effectiveDate: '2026-09-01',
    recordedAt: '2026-09-01T10:00:00Z',
    postingNumber: 'PST-000001',
    description: 'First posted, largest amount',
    signedAmount: '900.00',
    balanceAfter: '12400.00',
    streamPosition: 1,
  },
  {
    id: 'p2',
    effectiveDate: '2026-09-02',
    recordedAt: '2026-09-02T10:00:00Z',
    postingNumber: 'PST-000002',
    description: 'Second posted, middle amount',
    signedAmount: '500.00',
    balanceAfter: '13300.00',
    streamPosition: 2,
  },
];

describe('The statement stays in the order the service sent it', () => {
  it('renders rows in stream order, not amount order', () => {
    render(createElement(StatementTable, { rows: ROWS }));
    const rows = screen.getAllByRole('row').slice(1); // drop header row
    const postingNumbers = rows.map((row) => within(row).getByText(/PST-\d{6}/).textContent);
    expect(postingNumbers).toEqual(['PST-000003', 'PST-000001', 'PST-000002']);
  });

  it('offers no column a sort control', () => {
    render(createElement(StatementTable, { rows: ROWS }));
    const headers = screen.getAllByRole('columnheader');
    for (const header of headers) {
      expect(within(header).queryByRole('button')).toBeNull();
      expect(header).not.toHaveAttribute('aria-sort');
    }
  });
});
