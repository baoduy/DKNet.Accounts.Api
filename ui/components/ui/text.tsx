import type { ComponentProps, JSX } from 'react';
import { cn } from '@/components/ui/utils';

/** The 11px tracked all-caps label above a tile value or a panel section. Ported from Design/components/core/Label.jsx. */
export function Label({ className, ...props }: ComponentProps<'div'>): JSX.Element {
  return (
    <div
      data-slot="label"
      className={cn(
        'text-[length:var(--text-label-size)] leading-[var(--text-label-leading)] font-semibold tracking-[var(--tracking-label)] text-muted-foreground uppercase',
        className,
      )}
      {...props}
    />
  );
}

/** 12px secondary prose — field captions, timestamps, row sub-text. */
export function Caption({ className, ...props }: ComponentProps<'span'>): JSX.Element {
  return <span data-slot="caption" className={cn('text-[length:var(--text-caption-size)] leading-[var(--text-caption-leading)] text-muted-foreground', className)} {...props} />;
}

/** The explanatory paragraph that sits under a card and says why something is the way it is. */
export function Note({ className, ...props }: ComponentProps<'div'>): JSX.Element {
  return (
    <div
      data-slot="note"
      className={cn('text-[length:var(--text-caption-size)] leading-[var(--text-caption-leading)] text-pretty text-muted-foreground', className)}
      {...props}
    />
  );
}

/** Identifier type: JetBrains Mono at table size. */
export function Mono({ className, ...props }: ComponentProps<'span'>): JSX.Element {
  return <span data-slot="mono" className={cn('font-mono', className)} {...props} />;
}
