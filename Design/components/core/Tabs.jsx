import React from 'react';
import { Chip } from './Chip.jsx';

export function Tabs({ items = [], value, onChange, style, ...rest }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', ...style }} {...rest}>
      {items.map((it) => {
        const v = typeof it === 'string' ? it : it.value;
        const label = typeof it === 'string' ? it : it.label;
        return (
          <Chip key={v} selected={v === value} role="tab" aria-selected={v === value}
            onClick={() => onChange && onChange(v)}>{label}</Chip>
        );
      })}
    </div>
  );
}
