import React from 'react';
import { Card } from '../core/Card.jsx';
import { Label } from '../core/Label.jsx';
import { Money } from './Money.jsx';
import { Currency } from './Currency.jsx';

/**
 * Three tiles, never one. Takes the whole account and cannot be asked to render a
 * single value — the component's shape is what stops "just show the balance" creeping back.
 */
export function BalanceTiles({ account, layout = 'tiles', style, ...rest }) {
  const dp = account.decimalPlaces != null ? account.decimalPlaces : 2;
  const cells = [
    { label: 'Balance', value: account.balance },
    { label: 'Available', value: account.availableBalance },
    { label: 'Held', value: account.heldAmount }
  ];
  if (layout === 'inline') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', ...style }} {...rest}>
        {cells.map((c, i) => (
          <div key={c.label} style={i === 0 ? null : { borderLeft: '1px solid var(--border)', paddingLeft: 'var(--space-4)' }}>
            <Label>{c.label}</Label>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <Money amount={c.value} decimalPlaces={dp} align="left" style={{ fontSize: 18, lineHeight: '24px' }} />
              {i === 0 ? <Currency code={account.currency} style={{ fontSize: 'var(--text-caption-size)', color: 'var(--muted-foreground)' }} /> : null}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)', ...style }} {...rest}>
      {cells.map((c) => (
        <Card key={c.label} style={{ flex: 1 }}>
          <Label>{c.label}</Label>
          <div style={{ marginTop: 6 }}>
            <Money amount={c.value} decimalPlaces={dp} size="tile" align="left" />
          </div>
          <Currency code={account.currency} style={{ fontSize: 'var(--text-caption-size)', color: 'var(--muted-foreground)' }} />
        </Card>
      ))}
    </div>
  );
}
