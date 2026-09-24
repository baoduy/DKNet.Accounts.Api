import type { ComponentProps, JSX } from 'react';
import { cn } from '@/components/ui/utils';

export function Card({ className, ...props }: ComponentProps<'div'>): JSX.Element {
  return (
    <div
      data-slot="card"
      className={cn('flex flex-col gap-4 rounded-lg border border-border bg-card p-5 text-card-foreground shadow-card', className)}
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
  return <div data-slot="card-description" className={cn('text-muted-foreground text-sm', className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<'div'>): JSX.Element {
  return <div data-slot="card-content" className={cn(className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>): JSX.Element {
  return <div data-slot="card-footer" className={cn('flex items-center', className)} {...props} />;
}
