import type { CSSProperties, JSX, ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/text';

export interface AcknowledgementProps {
  title: ReactNode;
  children?: ReactNode;
  onDismiss?: () => void;
  style?: CSSProperties;
}

/** The confirmation that sits above the table card after a write succeeded. Composed per Design/ui_kits/accounts-crud/Accounts.jsx. */
export function Acknowledgement({ title, children, onDismiss, style }: AcknowledgementProps): JSX.Element {
  return (
    <Card role="status" style={style} className="flex-row items-start gap-4 border-l-3 border-l-credit">
      <div className="min-w-0">
        <Label>{title}</Label>
        {children ? <div className="mt-1.5 text-[length:var(--text-table-size)]">{children}</div> : null}
      </div>
      {onDismiss ? (
        <Button type="button" size="sm" variant="ghost" aria-label="Dismiss" className="ml-auto text-muted-foreground" onClick={onDismiss}>
          <X size={14} aria-hidden="true" />
        </Button>
      ) : null}
    </Card>
  );
}
