'use client';

import { useRef } from 'react';
import type { CSSProperties, JSX, KeyboardEvent } from 'react';
import { Chip } from '@/components/ui/chip';

export interface TabItem {
  value: string;
  label: string;
}

export interface TabsProps {
  items: Array<TabItem | string>;
  value: string;
  onChange?: (value: string) => void;
  style?: CSSProperties;
  /** The tablist's accessible name, e.g. `Activity window`. */
  'aria-label'?: string;
}

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** Chip-shaped tabs — there is no underline tab style in this console. Ported from Design/components/core/Tabs.jsx. */
export function Tabs({ items, value, onChange, style, 'aria-label': ariaLabel }: TabsProps): JSX.Element {
  const list = useRef<HTMLDivElement>(null);
  const values = items.map((item) => (typeof item === 'string' ? item : item.value));

  const select = (index: number): void => {
    onChange?.(values[index]);
    list.current?.querySelectorAll<HTMLElement>('[role="tab"]')[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const current = Math.max(0, values.indexOf(value));
    let next: number | undefined;
    if (event.key in STEP) next = (current + STEP[event.key] + values.length) % values.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = values.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    select(next);
  };

  return (
    <div ref={list} role="tablist" aria-label={ariaLabel} style={style} className="flex items-center gap-2" onKeyDown={onKeyDown}>
      {items.map((item, index) => {
        const itemValue = values[index];
        const selected = itemValue === value;
        return (
          <Chip
            key={itemValue}
            role="tab"
            aria-selected={selected}
            tabIndex={selected || (!values.includes(value) && index === 0) ? 0 : -1}
            selected={selected}
            onClick={() => onChange?.(itemValue)}
          >
            {typeof item === 'string' ? item : item.label}
          </Chip>
        );
      })}
    </div>
  );
}
