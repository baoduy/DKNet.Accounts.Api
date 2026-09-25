'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, JSX, ReactNode } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldLabelContext } from '@/components/ui/select';
import { Caption } from '@/components/ui/text';
import { cn } from '@/components/ui/utils';

export interface FilterFieldProps {
  label: ReactNode;
  hint?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
}

/** One labelled row inside the filter panel. A `Select` inside it is named by `label`. */
export function FilterField({ label, hint, children, style }: FilterFieldProps): JSX.Element {
  const labelId = useId();
  return (
    <div style={style} className="grid gap-2">
      <Caption id={labelId}>{label}</Caption>
      <FieldLabelContext.Provider value={labelId}>{children}</FieldLabelContext.Provider>
      {hint ? <Caption>{hint}</Caption> : null}
    </div>
  );
}

export interface FilterMenuProps {
  /** Filters currently away from their default. Drives the count and enables Clear all. */
  activeCount?: number;
  /** Resets every filter. Omit to hide the footer. */
  onClear?: () => void;
  label?: string;
  /** `FilterField` rows. */
  children?: ReactNode;
  style?: CSSProperties;
}

/**
 * A table's filters behind one button at the right of the card bar. Esc or a click outside
 * closes the panel; Esc hands focus back to the button. Ported from Design/components/forms/FilterMenu.jsx.
 */
export function FilterMenu({ activeCount = 0, onClear, label = 'Filter', children, style }: FilterMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const countId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event: MouseEvent): void => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div
      ref={root}
      style={style}
      className="relative"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !open) return;
        // Stop here so an open DetailPanel behind the table does not take the same Esc as its own.
        event.stopPropagation();
        setOpen(false);
        button.current?.focus();
      }}
    >
      <Button
        ref={button}
        type="button"
        aria-label={label}
        aria-describedby={activeCount > 0 ? countId : undefined}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(open && 'bg-surface-selected')}
        onClick={() => setOpen((value) => !value)}
      >
        <Filter size={14} aria-hidden="true" />
        {label}
        {activeCount > 0 ? (
          <span id={countId} className="min-w-4.5 rounded-full bg-primary px-1.25 text-center text-[length:var(--text-label-size)] leading-4.5 font-semibold text-primary-foreground tabular-nums">
            {activeCount}
          </span>
        ) : null}
        <ChevronDown size={14} aria-hidden="true" className="text-muted-foreground" />
      </Button>
      {open ? (
        <div
          role="group"
          aria-label="Filters"
          className="absolute top-[calc(100%+0.375rem)] right-0 z-40 grid w-68 gap-4 rounded-lg border border-border bg-popover p-5 text-popover-foreground shadow-overlay"
        >
          {children}
          {onClear ? (
            <div className="flex items-center gap-3 border-t border-border pt-3">
              <Caption>{activeCount > 0 ? `${activeCount} filter${activeCount === 1 ? '' : 's'} applied` : 'No filters applied'}</Caption>
              <Button type="button" size="sm" variant="ghost" disabled={activeCount === 0} onClick={onClear} className="ml-auto">
                Clear all
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
