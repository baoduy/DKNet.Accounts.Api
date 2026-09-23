import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps, JSX } from 'react';
import { cn } from '@/components/ui/utils';

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
  {
    variants: {
      variant: {
        default: 'border border-border-control bg-card text-foreground',
        primary: 'bg-primary text-primary-foreground border border-primary hover:bg-primary-hover',
        ghost: 'border border-transparent bg-transparent text-foreground hover:bg-surface-hover',
        destructive: 'bg-destructive-solid text-destructive-foreground border border-destructive-solid hover:bg-destructive-hover',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-3',
        lg: 'h-11 px-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps): JSX.Element {
  const Comp = asChild ? Slot : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
