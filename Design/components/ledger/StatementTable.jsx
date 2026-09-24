import React from 'react';
import { Money } from './Money.jsx';
import { PostingNumber } from './AccountNumber.jsx';
import { StatusBadge } from './StatusBadge.jsx';
import { Chip } from '../core/Chip.jsx';
import { Caption } from '../core/Label.jsx';

const th = {
  fontSize: 'var(--text-caption-size)', lineHeight: 'var(--text-caption-leading)',
  fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-table-head)',
  color: 'var(--muted-foreground)', textAlign: 'left', padding: 'var(--space-2) var(--cell-padding-x)',
  background: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap'
};
const td = {
  fontSize: 'var(--text-table-size)', lineHeight: 'var(--text-table-leading)',
  padding: 'var(--cell-padding-y) var(--cell-padding-x)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap'
};

/**
 * Not LedgerTable: different paging (pageIndex), different ordering guarantee
 * (stream order, unsortable) and different row semantics (reversal lineage,
 * struck-through amounts).
 */
export function StatementTable({
  rows = [], decimalPlaces = 2, selectedId, onSelectRow, postingHref,
  emptyMessage = 'No postings recorded on this account.', style, ...rest
}) {
  return (
    <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
      <table style={{ width: '100%', minWidth: 'max-content', borderCollapse: 'collapse', ...style }} {...rest}>
      <thead>
        <tr>
          <th style={th}>Effective</th>
          <th style={th}>Recorded</th>
          <th style={th}>Posting no.</th>
          <th style={th}>Description</th>
          <th style={{ ...th, textAlign: 'right' }}>Amount</th>
          <th style={{ ...th, textAlign: 'right' }}>Balance after</th>
          <th style={{ ...th, textAlign: 'right' }}>#</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={7} style={{ ...td, color: 'var(--muted-foreground)', textAlign: 'center', padding: 'var(--space-6) var(--cell-padding-x)' }}>{emptyMessage}</td></tr>
        ) : rows.map((r, i) => (
          <StatementRow key={r.id || r.postingNumber} row={r} last={i === rows.length - 1}
            decimalPlaces={decimalPlaces} postingHref={postingHref}
            picked={selectedId != null && String(selectedId) === String(r.id || r.postingNumber)}
            onSelect={onSelectRow ? () => onSelectRow(r) : undefined} />
        ))}
      </tbody>
      </table>
    </div>
  );
}

function StatementRow({ row, last, decimalPlaces, postingHref, picked, onSelect }) {
  const [hover, setHover] = React.useState(false);
  const bg = picked ? 'var(--surface-selected)' : hover && onSelect ? 'var(--muted)' : undefined;
  const cell = { ...td, background: bg, borderBottom: last ? 0 : td.borderBottom };
  const reversed = row.status === 'Reversed';
  return (
    <tr onClick={onSelect ? (e) => { if (!e.target.closest('a')) onSelect(); } : undefined}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ cursor: onSelect ? 'pointer' : undefined, background: bg }}>
      <td style={cell}>{row.effectiveDate}</td>
      <td style={{ ...cell, color: 'var(--muted-foreground)', fontSize: 'var(--text-caption-size)' }}>{row.recordedAt}</td>
      <td style={cell}>
        <PostingNumber value={row.postingNumber} href={postingHref ? postingHref(row) : undefined} />
        {reversed ? <span style={{ marginLeft: 6 }}><StatusBadge status="Reversed" /></span> : null}
      </td>
      <td style={{ ...cell, whiteSpace: 'normal' }}>
        {row.description}{row.category ? <span style={{ marginLeft: 6 }}><Chip>{row.category}</Chip></span> : null}
      </td>
      <td style={{ ...cell, textAlign: 'right' }}>
        <Money amount={row.signedAmount} decimalPlaces={decimalPlaces} signed struck={reversed} />
      </td>
      <td style={{ ...cell, textAlign: 'right' }}>
        {reversed
          ? <Caption><Money amount={row.balanceAfter} decimalPlaces={decimalPlaces} style={{ color: 'var(--muted-foreground)' }} /></Caption>
          : <Money amount={row.balanceAfter} decimalPlaces={decimalPlaces} />}
      </td>
      <td style={{ ...cell, textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--muted-foreground)' }}>{row.streamPosition}</td>
    </tr>
  );
}
