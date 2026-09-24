import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ComponentProps, JSX } from 'react';
import { cn } from '@/components/ui/utils';

export function Sheet(props: ComponentProps<typeof DialogPrimitive.Root>): JSX.Element {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />;
}

export function SheetTrigger(props: ComponentProps<typeof DialogPrimitive.Trigger>): JSX.Element {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

/**
 * `modal={false}` (row 5): a non-modal overlay panel that never dims or blocks the region
 * behind it — Radix's own setting for that, not a bespoke rewrite.
 */
export function SheetContent({
  className,
  side = 'right',
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { side?: 'top' | 'right' | 'bottom' | 'left' }): JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          'fixed z-50 flex flex-col gap-4 border-border bg-card p-5 text-card-foreground shadow-overlay',
          side === 'right' && 'inset-y-0 right-0 h-full w-[var(--drawer-width)] border-l',
          side === 'left' && 'inset-y-0 left-0 h-full w-[var(--drawer-width)] border-r',
          side === 'top' && 'inset-x-0 top-0 border-b',
          side === 'bottom' && 'inset-x-0 bottom-0 border-t',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>): JSX.Element {
  return <DialogPrimitive.Title data-slot="sheet-title" className={cn('font-semibold text-foreground', className)} {...props} />;
}
