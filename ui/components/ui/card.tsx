import type { ComponentProps, JSX } from 'react';
import { cn } from '@/components/ui/utils';

export interface CardProps extends ComponentProps<'div'> {
  /** The card padding. Turn off when the card holds a full-bleed table between `CardBar`s. */
  padded?: boolean;
  /** Use the overlay shadow — dialogs and the detail panel only. */
  overlay?: boolean;
}

export function Card({ padded = true, overlay = false, className, ...props }: CardProps): JSX.Element {
  return (
    <div
      data-slot="card"
      className={cn(
        'rounded-lg border border-border bg-card text-card-foreground shadow-card',
        // Unpadded, the card clips its children to the radius: a nowrap table would otherwise paint through the corner.
        padded ? 'flex flex-col gap-4 p-5' : 'overflow-hidden',
        overlay && 'shadow-overlay',
        className,
      )}
      {...props}
    />
  );
}

export interface CardBarProps extends ComponentProps<'div'> {
  /** `top` draws a bottom hairline (filter bar); `bottom` draws a top one (pager). */
  position?: 'top' | 'bottom';
}

/** A bordered strip inside an unpadded Card — the filter bar above a table, or the pager below one. Ported from Design/components/core/Card.jsx. */
export function CardBar({ position = 'top', className, ...props }: CardBarProps): JSX.Element {
  return (
    <div
      data-slot="card-bar"
      // Horizontal inset matches --cell-padding-x so the bar lines up with the table's column grid.
      className={cn('flex items-center gap-2 border-border px-(--cell-padding-x) py-3', position === 'top' ? 'border-b' : 'border-t', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>): JSX.Element {
  return <div data-slot="card-header" className={cn('flex flex-col gap-1.5', className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<'div'>): JSX.Element {
  return <div data-slot="card-title" className={cn('font-semibold leading-none', className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<'div'>): JSX.Element {
  return <div data-slot="card-description" className={cn('text-caption text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<'div'>): JSX.Element {
  return <div data-slot="card-content" className={cn(className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>): JSX.Element {
  return <div data-slot="card-footer" className={cn('flex items-center', className)} {...props} />;
}
