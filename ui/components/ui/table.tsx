import type { ComponentProps, JSX } from 'react';
import { cn } from '@/components/ui/utils';

export function Table({ className, ...props }: ComponentProps<'table'>): JSX.Element {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table data-slot="table" className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentProps<'thead'>): JSX.Element {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b [&_tr]:border-border', className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<'tbody'>): JSX.Element {
  return <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<'tr'>): JSX.Element {
  return (
    <tr
      data-slot="table-row"
      className={cn('border-b border-border transition-colors hover:bg-surface-hover data-[state=selected]:bg-surface-selected', className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ComponentProps<'th'>): JSX.Element {
  return (
    <th
      data-slot="table-head"
      className={cn('h-(--row-height) px-(--cell-padding-x) text-left align-middle font-semibold text-muted-foreground', className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<'td'>): JSX.Element {
  return <td data-slot="table-cell" className={cn('px-(--cell-padding-x) py-(--cell-padding-y) align-middle', className)} {...props} />;
}
