import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { IdempotencyKeyField } from './IdempotencyKeyField';

describe('IdempotencyKeyField', () => {
  it('shows the minted key and its note', () => {
    render(createElement(IdempotencyKeyField, { value: 'abc-123', note: 'Regenerate only after a success.' }));
    expect(screen.getByText('abc-123')).toBeInTheDocument();
    expect(screen.getByText('Regenerate only after a success.')).toBeInTheDocument();
  });

  it('offers no regenerate control until the caller wires onRegenerate', () => {
    render(createElement(IdempotencyKeyField, { value: 'abc-123' }));
    expect(screen.queryByRole('button', { name: 'Regenerate' })).toBeNull();
  });

  it('calls onRegenerate when the caller wires it', () => {
    const onRegenerate = vi.fn();
    render(createElement(IdempotencyKeyField, { value: 'abc-123', onRegenerate }));
    screen.getByRole('button', { name: 'Regenerate' }).click();
    expect(onRegenerate).toHaveBeenCalled();
  });

  it('copies the key to the clipboard when one is available', () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(createElement(IdempotencyKeyField, { value: 'abc-123' }));
    screen.getByRole('button', { name: 'Copy' }).click();
    expect(writeText).toHaveBeenCalledWith('abc-123');
  });

  it('does nothing (never throws) copying when no clipboard is available', () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    render(createElement(IdempotencyKeyField, { value: 'abc-123' }));
    expect(() => screen.getByRole('button', { name: 'Copy' }).click()).not.toThrow();
  });
});
