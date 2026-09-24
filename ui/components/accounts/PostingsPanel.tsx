/**
 * DRK-1696 §3 row 4 — `DateRangeFilter` + the three narrowing controls over a `StatementTable
 * showBalanceAfter={false}`. Presentational: filter state and postings both arrive as props,
 * so this renders with no query provider (`AccountDetailScreen` owns the fetching).
 */
import type { CSSProperties, JSX } from 'react';
import { DateRangeFilter, type DatePreset } from '@/components/forms/DateRangeFilter';
import { StatementTable, type StatementRowShape } from '@/components/ledger/StatementTable';
import { MAX_POSTING_PERIOD_DAYS, POSTING_CATEGORIES, POSTING_DIRECTIONS, POSTING_STATUSES, postingPeriodError } from '@/lib/accounts/postings-filter';

/** Only spans this screen's own 90-day cap can ever accept — `DateRangeFilter`'s own generic
 * `month`/`all` presets would always be refused here, so this screen offers its own set. */
const POSTING_PERIOD_PRESETS: DatePreset[] = [
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: String(MAX_POSTING_PERIOD_DAYS), label: `${MAX_POSTING_PERIOD_DAYS}d` },
];

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

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
  /** DRK-1713 §3 row 14 — the links between a posting and its reversal, so `Reverse` is refused on either. */
  reversedByPostingId?: string | null;
  reversesPostingId?: string | null;
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
  /** DRK-1704 finding 1/14 — the period is operator-editable end to end; a span the service
   * would refuse (over 90 days, inverted or unset) is shown here and never fetched (R2). */
  onPeriodChange?: (from: string, to: string) => void;
  selectedId?: string | null;
  onSelectRow?: (row: PostingsPanelRow) => void;
  style?: CSSProperties;
}

const EMPTY_FILTER: PostingsPanelFilter = { direction: '', category: '', status: '' };

export function PostingsPanel({ rows, from, to, filter = EMPTY_FILTER, onFilterChange, onPeriodChange, selectedId, onSelectRow, style }: PostingsPanelProps): JSX.Element {
  function setFilter(patch: Partial<PostingsPanelFilter>): void {
    onFilterChange?.({ ...filter, ...patch });
  }

  function applyPreset(days: string): void {
    const to = new Date();
    const spanDays = Number(days);
    const from = new Date(to.getTime() - spanDays * 86_400_000);
    onPeriodChange?.(toDateOnly(from), toDateOnly(to));
  }

  const periodError = postingPeriodError(from, to);

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
      <DateRangeFilter from={from} to={to} presets={POSTING_PERIOD_PRESETS} onPreset={applyPreset} />

      <div className="flex items-center gap-3">
        <label className="flex flex-col gap-1">
          From
          <input type="date" aria-label="From" value={from} onChange={(event) => onPeriodChange?.(event.target.value, to)} />
        </label>
        <label className="flex flex-col gap-1">
          To
          <input type="date" aria-label="To" value={to} onChange={(event) => onPeriodChange?.(from, event.target.value)} />
        </label>
      </div>

      {periodError ? <p role="alert">{periodError}</p> : null}

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
