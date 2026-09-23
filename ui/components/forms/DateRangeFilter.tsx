import type { CSSProperties, JSX } from 'react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';

export interface DatePreset {
  value: string;
  label: string;
}

export interface DateRangeFilterProps {
  /** Formatted display bound, e.g. `1 Sep 2026`. The API takes `DateOnly`. */
  from: string;
  to: string;
  preset?: string;
  presets?: DatePreset[];
  onPreset?: (value: string) => void;
  onOpenPicker?: () => void;
  style?: CSSProperties;
}

const DEFAULT_PRESETS: DatePreset[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All' },
];

export function DateRangeFilter({ from, to, preset, presets = DEFAULT_PRESETS, onPreset, onOpenPicker, style }: DateRangeFilterProps): JSX.Element {
  return (
    <div className="flex items-center gap-2" style={style}>
      <Button variant="default" size="sm" onClick={onOpenPicker}>
        {from} – {to}
      </Button>
      <div className="flex items-center gap-1">
        {presets.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onPreset?.(option.value)}
            className={cn(
              'rounded-full px-2 py-0.5 text-xs',
              preset === option.value ? 'bg-surface-selected text-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
