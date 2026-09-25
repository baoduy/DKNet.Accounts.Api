import type { ComponentProps, JSX, KeyboardEvent, MouseEventHandler } from 'react';
import { cn } from '@/components/ui/utils';

export interface ChipProps extends Omit<ComponentProps<'span'>, 'onClick'> {
  /** Selected chips take the accent ground at weight 600. */
  selected?: boolean;
  /** Supplying a handler makes the chip a button; omit it for a pure label. */
  onClick?: MouseEventHandler<HTMLSpanElement>;
}

/** The smallest label in the console — a category, a classification, or a segmented option. Ported from Design/components/core/Chip.jsx. */
export function Chip({ selected = false, onClick, onKeyDown, className, ...props }: ChipProps): JSX.Element {
  const interactive = typeof onClick === 'function';
  return (
    <span
      data-slot="chip"
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event: KeyboardEvent<HTMLSpanElement>) => {
        onKeyDown?.(event);
        if (interactive && !event.defaultPrevented && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
      className={cn(
        'inline-block rounded-full px-2 py-0.5 text-[length:var(--text-label-size)] leading-[var(--text-label-leading)] whitespace-nowrap',
        selected ? 'bg-surface-selected font-semibold text-foreground' : 'bg-muted text-muted-foreground',
        interactive &&
          'cursor-pointer transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        interactive && (selected ? 'hover:bg-surface-selected-hover' : 'hover:bg-surface-hover hover:text-foreground'),
        className,
      )}
      {...props}
    />
  );
}
