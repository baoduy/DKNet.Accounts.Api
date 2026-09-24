import type { CSSProperties, JSX, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export interface IdempotencyKeyFieldProps {
  /** The minted key. Mint it on mount, never on submit. */
  value: string;
  /** Only wire this to a reset-after-success path. */
  onRegenerate?: () => void;
  note?: ReactNode;
  style?: CSSProperties;
}

export function IdempotencyKeyField({ value, onRegenerate, note, style }: IdempotencyKeyFieldProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1" style={style}>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[length:var(--text-caption-size)]">{value}</span>
        <Button variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(value)}>
          Copy
        </Button>
        {onRegenerate ? (
          <Button variant="ghost" size="sm" onClick={onRegenerate}>
            Regenerate
          </Button>
        ) : null}
      </div>
      {note ? <p className="text-[length:var(--text-caption-size)] text-muted-foreground">{note}</p> : null}
    </div>
  );
}
