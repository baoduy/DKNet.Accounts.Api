import type { CSSProperties, JSX } from 'react';

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

export function DateRangeFilter(_props: DateRangeFilterProps): JSX.Element {
  throw new Error('Not implemented: DateRangeFilter');
}
