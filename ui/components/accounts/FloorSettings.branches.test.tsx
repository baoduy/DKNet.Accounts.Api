/**
 * DRK-1704 finding 12 — mutation-coverage companion to the frozen `FloorSettings.test.tsx`:
 * the typed-value onChange paths and the field-level error rendering.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FloorSettings, type FloorSettingsValue } from './FloorSettings';

const VALUE: FloorSettingsValue = { permittedToGoNegative: true, overdraftLimit: '500.00', minimumBalance: '10.00' };

describe('FloorSettings — typed values', () => {
  it('reports a typed overdraft limit verbatim', () => {
    const onChange = vi.fn();
    render(createElement(FloorSettings, { value: VALUE, currency: 'SGD', onChange }));

    fireEvent.change(screen.getByLabelText('Overdraft limit'), { target: { value: '750.00' } });

    expect(onChange).toHaveBeenCalledWith({ ...VALUE, overdraftLimit: '750.00' });
  });

  it('clears the overdraft limit to null, not an empty string, when emptied', () => {
    const onChange = vi.fn();
    render(createElement(FloorSettings, { value: VALUE, currency: 'SGD', onChange }));

    fireEvent.change(screen.getByLabelText('Overdraft limit'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith({ ...VALUE, overdraftLimit: null });
  });

  it('marks the overdraft limit field invalid and shows its message when refused', () => {
    render(createElement(FloorSettings, { value: VALUE, currency: 'SGD', onChange: vi.fn(), overdraftLimitError: 'Too small.' }));
    expect(screen.getByLabelText('Overdraft limit')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Too small.')).toBeInTheDocument();
  });
});
