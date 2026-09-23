import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ComponentProps, JSX } from 'react';
import { cn } from '@/components/ui/utils';

export function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>): JSX.Element {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

/** The console's blocking modal — unlike `Sheet`, this keeps Radix's default `modal={true}`. */
export function DialogContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>): JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay data-slot="dialog-overlay" className="fixed inset-0 z-50 bg-scrim" />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'fixed top-1/2 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-overlay',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>): JSX.Element {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn('font-semibold text-foreground', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: ComponentProps<'div'>): JSX.Element {
  return <div data-slot="dialog-footer" className={cn('flex items-center justify-end gap-2', className)} {...props} />;
}
