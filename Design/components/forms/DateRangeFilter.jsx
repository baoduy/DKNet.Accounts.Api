import React from 'react';
import { Chip } from '../core/Chip.jsx';
import { Icon } from '../core/Icon.jsx';

const DEFAULT_PRESETS = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All' }
];

export function DateRangeFilter({ from, to, preset, presets = DEFAULT_PRESETS, onPreset, onOpenPicker, style, ...rest }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', ...style }} {...rest}>
      <span
        role={onOpenPicker ? 'button' : undefined}
        tabIndex={onOpenPicker ? 0 : undefined}
        onClick={onOpenPicker}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
          border: '1px solid var(--border-control)', borderRadius: 'var(--radius-md)',
          padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-table-size)',
          background: 'var(--card)', color: 'var(--foreground)',
          cursor: onOpenPicker ? 'pointer' : 'default', whiteSpace: 'nowrap'
        }}
      >
        <Icon name="calendar" size={14} style={{ color: 'var(--muted-foreground)' }} />
        {from} → {to}
        <Icon name="chevron-down" size={14} style={{ color: 'var(--muted-foreground)' }} />
      </span>
      {presets.map((p) => (
        <Chip key={p.value} selected={p.value === preset} onClick={() => onPreset && onPreset(p.value)}>{p.label}</Chip>
      ))}
    </div>
  );
}
