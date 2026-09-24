import React from 'react';
import { Badge } from '../core/Badge.jsx';

/** The one colour map. Every status in the console resolves here and nowhere else. */
export const STATUS_TONE = {
  Active: 'credit',
  Dormant: 'warning',
  Frozen: 'debit',
  Closed: 'neutral',
  Inactive: 'neutral',
  Posted: 'info',
  Reversed: 'neutral'
};

export function StatusBadge({ status, tone, style, ...rest }) {
  return <Badge tone={tone || STATUS_TONE[status] || 'neutral'} style={style} {...rest}>{status}</Badge>;
}
