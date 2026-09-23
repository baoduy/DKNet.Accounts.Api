import type { CSSProperties, JSX } from 'react';
import { Id } from '@/components/ui/id';
import { StatusBadge } from '@/components/ledger/StatusBadge';

export interface IdProps {
  value: string;
  href?: string;
  onNavigate?: (value: string) => void;
  style?: CSSProperties;
}

export function AccountNumber({ value, href, onNavigate, style }: IdProps): JSX.Element {
  return <Id value={value} href={href} onNavigate={onNavigate} style={style} />;
}

export interface PostingNumberProps extends IdProps {
  /** Pair with a `<StatusBadge status="Reversed" />` beside it on statement rows. */
  reversed?: boolean;
}

export function PostingNumber({ value, href, onNavigate, style, reversed = false }: PostingNumberProps): JSX.Element {
  return (
    <span className="inline-flex items-center gap-2">
      <Id value={value} href={href} onNavigate={onNavigate} style={style} />
      {reversed ? <StatusBadge status="Reversed" /> : null}
    </span>
  );
}
