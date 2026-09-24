import type { ComponentProps, JSX } from 'react';
import { cn } from '@/components/ui/utils';

/** A static placeholder block: no pulse or shimmer (Design/components/core/Skeleton.prompt.md), and
 * hidden from assistive technology — the region it stands in for is announced once it is drawn. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>): JSX.Element {
  return <div data-slot="skeleton" aria-hidden="true" className={cn('h-(--text-body-leading) rounded-sm bg-muted', className)} {...props} />;
}
