/**
 * DRK-1696 §3 row 4 — the account's postings. Presentational: filter state and postings both
 * arrive as props, so this renders with no query provider (`AccountDetailScreen` owns the
 * fetching).
 *
 * DRK-1745 §3 rows 3–5 (Design/ui_kits/account-detail) — the Records screen's table card scoped
 * to one account: search, `{rows} of {total}`, a filter menu with the one period choice
 * (7/14/30/90 days) and direction, category and status, the pager, and the side panel passed
 * through `panel` so it overlays the card's right edge. The Account column is dropped and
 * Description takes its place; no balance-after column — this table sorts.
 */
import type { CSSProperties, JSX, ReactNode } from 'react';
import { FailedRead } from '@/components/feedback/RefusalAlert';
import { FilterField, FilterMenu } from '@/components/forms/FilterMenu';
import { RecordsTable, type RecordsTableRow } from '@/components/records/RecordsTable';
import { Select } from '@/components/ui/select';
import { TableCard } from '@/components/ui/table-card';
import {
  DEFAULT_POSTING_PERIOD,
  POSTING_CATEGORIES,
  POSTING_DIRECTIONS,
  POSTING_PERIOD_OPTIONS,
  POSTING_STATUSES,
} from '@/lib/accounts/postings-filter';

export interface PostingsPanelRow extends RecordsTableRow {
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
  /** One of `POSTING_PERIODS`; `from`/`to` are derived from it, so no refused period can be asked for. */
  period?: string;
  onPeriodChange?: (period: string) => void;
  filter?: PostingsPanelFilter;
  onFilterChange?: (filter: PostingsPanelFilter) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  orderBy?: string;
  desc?: boolean;
  onSort?: (field: string) => void;
  selectedId?: string | null;
  onSelectRow?: (row: PostingsPanelRow) => void;
  /** The statement is still being read: the table keeps its headings over placeholder rows. */
  loading?: boolean;
  /** The statement read failed — stated in place of the table; the filters stay usable (DRK-1725 R2). */
  failure?: { error: unknown; onRetry: () => void };
  emptyMessage?: string;
  page?: number;
  pageCount?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  /** The service's count of every posting in the view. */
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  /** The side panel — overlays this card's right edge. */
  panel?: ReactNode;
  style?: CSSProperties;
}

const EMPTY_FILTER: PostingsPanelFilter = { direction: '', category: '', status: '' };

function anyOf(values: readonly string[]): { value: string; label: string }[] {
  return [{ value: '', label: 'Any' }, ...values.map((value) => ({ value, label: value }))];
}

export function PostingsPanel({
  rows,
  period = DEFAULT_POSTING_PERIOD,
  onPeriodChange,
  filter = EMPTY_FILTER,
  onFilterChange,
  search = '',
  onSearchChange,
  orderBy,
  desc,
  onSort,
  selectedId,
  onSelectRow,
  loading = false,
  failure,
  emptyMessage = 'No postings.',
  page = 1,
  pageCount = 1,
  pageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  total = 0,
  onPageChange,
  onPageSizeChange,
  panel,
  style,
}: PostingsPanelProps): JSX.Element {
  const activeCount = [period !== DEFAULT_POSTING_PERIOD, filter.direction, filter.category, filter.status].filter(Boolean).length;
  const narrow = (key: keyof PostingsPanelFilter, options: { value: string; label: string }[]): JSX.Element => (
    <Select options={options} value={filter[key]} className="w-full" onChange={(event) => onFilterChange?.({ ...filter, [key]: event.target.value })} />
  );

  return (
    <div data-testid="postings-panel" style={style}>
      <TableCard
        searchPlaceholder="Search record or reference"
        searchValue={search}
        onSearchChange={onSearchChange}
        rows={rows.length}
        total={total}
        filter={
          <FilterMenu
            activeCount={activeCount}
            onClear={() => {
              onPeriodChange?.(DEFAULT_POSTING_PERIOD);
              onFilterChange?.(EMPTY_FILTER);
            }}
          >
            <FilterField label="Period" hint="Effective date. 90 days is the widest window.">
              <Select options={POSTING_PERIOD_OPTIONS} value={period} className="w-full" onChange={(event) => onPeriodChange?.(event.target.value)} />
            </FilterField>
            <FilterField label="Direction">{narrow('direction', anyOf(POSTING_DIRECTIONS))}</FilterField>
            <FilterField label="Category">{narrow('category', anyOf(POSTING_CATEGORIES))}</FilterField>
            <FilterField label="Status">{narrow('status', anyOf(POSTING_STATUSES))}</FilterField>
          </FilterMenu>
        }
        pagination={{ page, pageCount, pageSize, pageSizeOptions, onPageChange, onPageSizeChange }}
        panel={panel}
      >
        {failure ? (
          <FailedRead error={failure.error} onRetry={failure.onRetry} />
        ) : (
          <RecordsTable
            scope="account"
            rows={rows}
            orderBy={orderBy}
            desc={desc}
            onSort={onSort}
            selectedId={selectedId}
            onSelectRow={onSelectRow ? (row) => onSelectRow(rows.find((candidate) => candidate.id === row.id)!) : undefined}
            loading={loading}
            placeholderRows={pageSize}
            emptyMessage={emptyMessage}
          />
        )}
      </TableCard>
    </div>
  );
}
