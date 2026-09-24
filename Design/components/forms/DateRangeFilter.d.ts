import type { CSSProperties } from 'react';

export interface DatePreset { value: string; label: string }

/**
 * Presets plus a custom range, bound to the URL. On Record posting the same picker
 * blocks future dates outright — `EFFECTIVE_DATE_IN_FUTURE` should be unreachable.
 */
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
export declare function DateRangeFilter(props: DateRangeFilterProps): JSX.Element;
