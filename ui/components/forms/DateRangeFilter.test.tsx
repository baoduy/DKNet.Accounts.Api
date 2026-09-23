import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DateRangeFilter } from './DateRangeFilter';

describe('DateRangeFilter', () => {
  it('shows the bound and every default preset chip, label and value paired correctly', () => {
    const onPreset = vi.fn();
    render(createElement(DateRangeFilter, { from: '1 Sep 2026', to: '21 Sep 2026', onPreset }));
    expect(screen.getByText('1 Sep 2026 – 21 Sep 2026')).toBeInTheDocument();
    for (const label of ['7d', '30d', '90d', 'This month', 'All']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    screen.getByText('90d').click();
    expect(onPreset).toHaveBeenCalledWith('90d');
    screen.getByText('This month').click();
    expect(onPreset).toHaveBeenCalledWith('month');
    screen.getByText('All').click();
    expect(onPreset).toHaveBeenCalledWith('all');
  });

  it('calls onPreset with the chosen preset value', () => {
    const onPreset = vi.fn();
    render(createElement(DateRangeFilter, { from: '1 Sep 2026', to: '21 Sep 2026', onPreset }));
    screen.getByText('7d').click();
    expect(onPreset).toHaveBeenCalledWith('7d');
  });

  it('does nothing (never throws) clicking a preset or the bound when neither handler is wired', () => {
    render(createElement(DateRangeFilter, { from: '1 Sep 2026', to: '21 Sep 2026' }));
    expect(() => screen.getByText('7d').click()).not.toThrow();
    expect(() => screen.getByText('1 Sep 2026 – 21 Sep 2026').click()).not.toThrow();
  });

  it('marks only the active preset, leaving the others unselected', () => {
    render(createElement(DateRangeFilter, { from: '1 Sep 2026', to: '21 Sep 2026', preset: '30d' }));
    expect(screen.getByText('30d')).toHaveClass('rounded-full', 'px-2', 'py-0.5', 'text-xs', 'bg-surface-selected', 'text-foreground');
    expect(screen.getByText('7d')).toHaveClass('rounded-full', 'bg-muted', 'text-muted-foreground');
    expect(screen.getByText('7d')).not.toHaveClass('bg-surface-selected');
  });

  it('calls onOpenPicker when the bound is clicked', () => {
    const onOpenPicker = vi.fn();
    render(createElement(DateRangeFilter, { from: '1 Sep 2026', to: '21 Sep 2026', onOpenPicker }));
    screen.getByText('1 Sep 2026 – 21 Sep 2026').click();
    expect(onOpenPicker).toHaveBeenCalled();
  });

  it('accepts a custom preset list', () => {
    render(createElement(DateRangeFilter, { from: '1 Sep 2026', to: '21 Sep 2026', presets: [{ value: 'ytd', label: 'YTD' }] }));
    expect(screen.getByText('YTD')).toBeInTheDocument();
    expect(screen.queryByText('30d')).toBeNull();
  });
});
