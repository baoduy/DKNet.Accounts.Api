import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps, JSX } from 'react';
import { cn } from '@/components/ui/utils';

export const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-caption font-medium whitespace-nowrap w-fit',
  {
    variants: {
      variant: {
        default: 'bg-muted text-muted-foreground',
        selected: 'bg-surface-selected text-foreground',
        disabled: 'bg-surface-disabled text-text-disabled line-through',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps extends ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

export function Badge({ className, variant, asChild = false, ...props }: BadgeProps): JSX.Element {
  const Comp = asChild ? Slot : 'span';
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props} />;
}
