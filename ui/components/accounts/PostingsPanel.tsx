/**
 * DRK-1696 §3 row 4 — `DateRangeFilter` + the three narrowing controls over a `StatementTable
 * showBalanceAfter={false}`. Presentational: filter state and postings both arrive as props,
 * so this renders with no query provider (`AccountDetailScreen` owns the fetching).
 */
import type { CSSProperties, JSX } from 'react';
import { DateRangeFilter } from '@/components/forms/DateRangeFilter';
import { StatementTable, type StatementRowShape } from '@/components/ledger/StatementTable';
import { POSTING_CATEGORIES, POSTING_DIRECTIONS, POSTING_STATUSES } from '@/lib/accounts/postings-filter';

export interface PostingsPanelRow {
  id: string;
  postingNumber: string;
  direction: string;
  amount: string;
  currency: string;
  decimalPlaces?: number;
  category?: string;
  status?: string;
  description?: string;
  effectiveDate: string;
}

export interface PostingsPanelFilter {
  direction: string;
  category: string;
  status: string;
}

export interface PostingsPanelProps {
  rows: PostingsPanelRow[];
  from: string;
  to: string;
  filter?: PostingsPanelFilter;
  onFilterChange?: (filter: PostingsPanelFilter) => void;
  selectedId?: string | null;
  onSelectRow?: (row: PostingsPanelRow) => void;
  style?: CSSProperties;
}

const EMPTY_FILTER: PostingsPanelFilter = { direction: '', category: '', status: '' };

export function PostingsPanel({ rows, from, to, filter = EMPTY_FILTER, onFilterChange, selectedId, onSelectRow, style }: PostingsPanelProps): JSX.Element {
  function setFilter(patch: Partial<PostingsPanelFilter>): void {
    onFilterChange?.({ ...filter, ...patch });
  }

  const statementRows: StatementRowShape[] = rows.map((row) => ({
    id: row.id,
    effectiveDate: row.effectiveDate,
    recordedAt: row.effectiveDate,
    postingNumber: row.postingNumber,
    description: row.description ?? '',
    category: row.category,
    signedAmount: row.direction === 'Debit' ? `-${row.amount}` : row.amount,
    balanceAfter: '0',
    streamPosition: 0,
    status: row.status as StatementRowShape['status'],
  }));

  return (
    <div data-testid="postings-panel" style={style} className="flex flex-col gap-3">
      <DateRangeFilter from={from} to={to} />

      <div className="flex items-center gap-3">
        <label className="flex flex-col gap-1">
          Direction filter
          <select aria-label="Direction filter" value={filter.direction} onChange={(event) => setFilter({ direction: event.target.value })}>
            <option value="">All directions</option>
            {POSTING_DIRECTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          Category filter
          <select aria-label="Category filter" value={filter.category} onChange={(event) => setFilter({ category: event.target.value })}>
            <option value="">All categories</option>
            {POSTING_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          Status filter
          <select aria-label="Status filter" value={filter.status} onChange={(event) => setFilter({ status: event.target.value })}>
            <option value="">All statuses</option>
            {POSTING_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <StatementTable
        rows={statementRows}
        decimalPlaces={rows[0]?.decimalPlaces}
        showBalanceAfter={false}
        selectedId={selectedId}
        onSelectRow={onSelectRow ? (row) => onSelectRow(rows.find((candidate) => candidate.id === row.id)!) : undefined}
      />
    </div>
  );
}
