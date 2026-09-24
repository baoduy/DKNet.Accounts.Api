import type { ComponentProps, JSX } from 'react';
import { cn } from '@/components/ui/utils';

export function Skeleton({ className, ...props }: ComponentProps<'div'>): JSX.Element {
  return <div data-slot="skeleton" className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}
