import React from 'react';
import { Icon } from './Icon.jsx';
import { CardBar } from './Card.jsx';
import { Select } from '../forms/Select.jsx';

function PagerButton({ icon, label, disabled, onClick }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      style={{
        width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '999px', border: '1px solid ' + (disabled ? 'var(--border)' : 'var(--border-control)'),
        background: 'var(--card)', color: disabled ? 'var(--muted-foreground)' : 'var(--foreground)',
        cursor: disabled ? 'not-allowed' : 'pointer', padding: 0
      }}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

/**
 * Built on CardBar rather than repeating its box. The pager and the filter bar are the
 * same strip at opposite ends of a card, so they must share one inset, one vertical
 * rhythm and one hairline — composing guarantees it instead of hoping two files agree.
 *
 * Rows per page on the left, the page position and the four round steppers on the right:
 * first, previous, next, last. Ends disable rather than disappear, so the control keeps
 * its width and the row does not reflow as the user walks the pages.
 */
export function Pagination({
  page = 1, pageCount = 1, pageSize = 10, pageSizeOptions = [10, 25, 50, 100],
  onPageChange, onPageSizeChange, summary, position = 'bottom',
  canPrevious, canNext, style, ...rest
}) {
  const last = Math.max(1, pageCount);
  const current = Math.min(Math.max(1, page), last);
  const prevOk = (canPrevious === undefined ? current > 1 : canPrevious);
  const nextOk = (canNext === undefined ? current < last : canNext);
  const go = (n) => { if (onPageChange) onPageChange(Math.min(Math.max(1, n), last)); };
  const caption = { fontSize: 'var(--text-caption-size)', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' };
  return (
    <CardBar position={position} style={style} {...rest}>
      <span style={caption}>Rows per page</span>
      <Select
        options={pageSizeOptions.map((n) => String(n))}
        value={String(pageSize)}
        aria-label="Rows per page"
        onChange={(e) => onPageSizeChange && onPageSizeChange(Number(e.target.value))}
      />
      {summary ? <span style={{ ...caption, marginLeft: 'var(--space-4)' }}>{summary}</span> : null}
      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
        <span style={caption}>Page {current} of {last}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <PagerButton icon="chevrons-left" label="First page" disabled={!prevOk} onClick={() => go(1)} />
          <PagerButton icon="chevron-left" label="Previous page" disabled={!prevOk} onClick={() => go(current - 1)} />
          <PagerButton icon="chevron-right" label="Next page" disabled={!nextOk} onClick={() => go(current + 1)} />
          <PagerButton icon="chevrons-right" label="Last page" disabled={!nextOk} onClick={() => go(last)} />
        </span>
      </span>
    </CardBar>
  );
}
