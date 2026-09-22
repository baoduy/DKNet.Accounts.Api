import React from 'react';
import { Input } from './Input.jsx';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';
import { Caption } from '../core/Label.jsx';

export function MetadataEditor({ entries = [], onChange, readOnly = false, style, ...rest }) {
  const update = (i, part) => {
    if (!onChange) return;
    const next = entries.map((e, j) => (j === i ? { ...e, ...part } : e));
    onChange(next);
  };
  const add = () => onChange && onChange([...entries, { key: '', value: '' }]);
  const remove = (i) => onChange && onChange(entries.filter((_, j) => j !== i));

  if (readOnly) {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption-size)', color: 'var(--muted-foreground)', ...style }} {...rest}>
        {entries.length === 0 ? <Caption>No metadata.</Caption>
          : entries.map((e) => e.key + '=' + e.value).join(' · ')}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', ...style }} {...rest}>
      {entries.map((e, i) => (
        <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <Input mono placeholder="key" value={e.key} onChange={(ev) => update(i, { key: ev.target.value })} style={{ flex: '0 0 160px' }} />
          <Input mono placeholder="value" value={e.value} onChange={(ev) => update(i, { value: ev.target.value })} style={{ flex: 1 }} />
          <Button size="sm" variant="ghost" onClick={() => remove(i)} aria-label="Remove"><Icon name="x" size={14} /></Button>
        </div>
      ))}
      <div><Button size="sm" icon={<Icon name="plus" size={14} />} onClick={add}>Add pair</Button></div>
    </div>
  );
}
