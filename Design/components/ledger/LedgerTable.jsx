import React from 'react';

const thStyle = {
  fontSize: 'var(--text-caption-size)', lineHeight: 'var(--text-caption-leading)',
  fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-table-head)',
  color: 'var(--muted-foreground)', textAlign: 'left', padding: 'var(--space-2) var(--cell-padding-x)',
  background: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap'
};
const tdStyle = {
  fontSize: 'var(--text-table-size)', lineHeight: 'var(--text-table-leading)',
  padding: 'var(--cell-padding-y) var(--cell-padding-x)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap'
};

export function LedgerTable({
  columns = [], rows = [], rowKey = 'id', selectedId, onSelectRow,
  orderBy, desc = false, onSort, emptyMessage = 'Nothing to show.', style, ...rest
}) {
  const keyOf = (row, i) => (typeof rowKey === 'function' ? rowKey(row) : row[rowKey] != null ? row[rowKey] : i);
  return (
    <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
      <table style={{ width: '100%', minWidth: 'max-content', borderCollapse: 'collapse', ...style }} {...rest}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} scope="col"
              onClick={c.sortable && onSort ? () => onSort(c.queryAs || c.key) : undefined}
              title={c.sortable === false ? 'Computed on the entity — not sortable' : undefined}
              style={{
                ...thStyle,
                textAlign: c.align === 'right' ? 'right' : 'left',
                cursor: c.sortable && onSort ? 'pointer' : 'default',
                color: c.sortable === false ? 'var(--reversed)' : thStyle.color
              }}>
              {c.header}
              {c.sortable ? <span style={{
                marginLeft: 'var(--space-1)',
                color: orderBy === (c.queryAs || c.key) ? 'var(--foreground)' : 'var(--text-disabled)'
              }}>
                {orderBy === (c.queryAs || c.key) ? (desc ? '↓' : '↑') : '↕'}
              </span> : null}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={columns.length} style={{ ...tdStyle, color: 'var(--muted-foreground)', textAlign: 'center', padding: 'var(--space-6) var(--cell-padding-x)' }}>{emptyMessage}</td></tr>
        ) : rows.map((row, i) => {
          const k = keyOf(row, i);
          const picked = selectedId != null && String(selectedId) === String(k);
          return (
            <LedgerRow key={k} picked={picked} onSelect={onSelectRow ? () => onSelectRow(row) : undefined}>
              {columns.map((c) => (
                <td key={c.key} style={{
                  ...tdStyle,
                  textAlign: c.align === 'right' ? 'right' : 'left',
                  borderBottom: i === rows.length - 1 ? 0 : tdStyle.borderBottom
                }}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </LedgerRow>
          );
        })}
      </tbody>
      </table>
    </div>
  );
}

function LedgerRow({ picked, onSelect, children }) {
  const [hover, setHover] = React.useState(false);
  const bg = picked ? 'var(--surface-selected)' : hover && onSelect ? 'var(--muted)' : undefined;
  return (
    <tr
      onClick={onSelect ? (e) => { if (!e.target.closest('a')) onSelect(); } : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ cursor: onSelect ? 'pointer' : undefined, background: bg }}
    >{React.Children.map(children, (child) => child && React.cloneElement(child, { style: { ...child.props.style, background: bg } }))}</tr>
  );
}
