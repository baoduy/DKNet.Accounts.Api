import type { ComponentProps, JSX } from 'react';
import { cn } from '@/components/ui/utils';

export function Input({ className, type, ...props }: ComponentProps<'input'>): JSX.Element {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 rounded-md border border-border-control bg-card px-3 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]',
        className,
      )}
      {...props}
    />
  );
}
