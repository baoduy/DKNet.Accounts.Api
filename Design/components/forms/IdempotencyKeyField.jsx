import React from 'react';
import { Label, Note } from '../core/Label.jsx';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';

export function IdempotencyKeyField({ value, onRegenerate, note, style, ...rest }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div style={style} {...rest}>
      <Label>Idempotency</Label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
        <code style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption-size)',
          color: 'var(--muted-foreground)', wordBreak: 'break-all', flex: 1
        }}>{value}</code>
        <Button size="sm" variant="ghost" onClick={copy} aria-label="Copy key">
          <Icon name={copied ? 'check' : 'copy'} size={14} />
        </Button>
        {onRegenerate ? (
          <Button size="sm" variant="ghost" onClick={onRegenerate} aria-label="Regenerate key">
            <Icon name="rotate-ccw" size={14} />
          </Button>
        ) : null}
      </div>
      <Note style={{ marginTop: 'var(--space-3)' }}>
        {note || 'Minted when this form opened, sent as the Idempotency-Key header, and regenerated only after a success. A double-click replays the first request and answers 200, not 201.'}
      </Note>
    </div>
  );
}
