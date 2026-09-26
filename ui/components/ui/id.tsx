import type { CSSProperties, JSX, MouseEvent } from 'react';
import { cn } from '@/components/ui/utils';

export interface IdProps {
  value: string;
  href?: string;
  onNavigate?: (value: string) => void;
  style?: CSSProperties;
}

/**
 * Fixed-width identifier: monospaced so two values line up character-for-character when
 * scanned by eye (DRK-1679 §3 row 3). The one base control shadcn does not supply.
 */
export function Id({ value, href, onNavigate, style }: IdProps): JSX.Element {
  const className = cn('font-mono text-caption tabular-nums');

  if (href || onNavigate) {
    return (
      <a
        href={href ?? '#'}
        className={cn(className, 'text-link hover:underline')}
        style={style}
        onClick={
          onNavigate
            ? (event: MouseEvent<HTMLAnchorElement>) => {
                event.preventDefault();
                onNavigate(value);
              }
            : undefined
        }
      >
        {value}
      </a>
    );
  }

  return (
    <span className={className} style={style}>
      {value}
    </span>
  );
}
