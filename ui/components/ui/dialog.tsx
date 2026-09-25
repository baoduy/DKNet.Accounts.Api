import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ComponentProps, CSSProperties, JSX, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';

export interface DialogProps extends ComponentProps<typeof DialogPrimitive.Root> {
  title?: ReactNode;
  /** Buttons. Confirm on the right, in `primary` or `destructive`. */
  footer?: ReactNode;
  /** Esc, a click on the scrim, or the default Close button. */
  onClose?: () => void;
  width?: number;
  /** `destructive` tints the title — reserved for irreversible refusals and deletes. */
  tone?: 'default' | 'destructive';
  /** Where focus goes once the dialog has closed; call `event.preventDefault()` to place it yourself. */
  onCloseAutoFocus?: (event: Event) => void;
  style?: CSSProperties;
}

/**
 * The console's modal (Design/components/feedback/Dialog.jsx): given a `title`, `footer` or
 * `onClose` it draws the whole dialog — scrim, 520px card, title, body, footer — on Radix, so
 * the focus trap and focus return stay Radix's. Without them it is the bare Radix root for
 * screens that still compose `DialogContent` themselves (R4).
 */
export function Dialog({ title, footer, onClose, width = 520, tone = 'default', onCloseAutoFocus, style, children, ...root }: DialogProps): JSX.Element {
  if (title === undefined && footer === undefined && onClose === undefined) {
    return (
      <DialogPrimitive.Root data-slot="dialog" {...root}>
        {children}
      </DialogPrimitive.Root>
    );
  }
  return (
    <DialogPrimitive.Root
      open={root.open ?? true}
      modal={root.modal}
      onOpenChange={(next) => {
        root.onOpenChange?.(next);
        if (!next) onClose?.();
      }}
    >
      <DialogContent aria-describedby={undefined} onCloseAutoFocus={onCloseAutoFocus} style={{ width, ...style }} className="block max-w-[calc(100%-3rem)] p-6">
        {title ? (
          <DialogTitle
            className={cn(
              'm-0 text-[length:var(--text-section-size)] leading-[var(--text-section-leading)] font-semibold',
              tone === 'destructive' ? 'text-destructive-solid' : 'text-foreground',
            )}
          >
            {title}
          </DialogTitle>
        ) : null}
        <div className={cn('text-[length:var(--text-body-size)] leading-[var(--text-section-leading)]', title ? 'mt-3' : undefined)}>{children}</div>
        {footer !== undefined ? (
          <div data-slot="dialog-footer" className="mt-4 flex gap-2">
            {footer}
          </div>
        ) : onClose ? (
          <div data-slot="dialog-footer" className="mt-4 flex gap-2">
            <Button type="button" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </DialogPrimitive.Root>
  );
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
