import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MetadataEditor } from './MetadataEditor';

describe('MetadataEditor — read-only', () => {
  it('collapses to the one-line key=value summary', () => {
    render(
      createElement(MetadataEditor, {
        readOnly: true,
        entries: [
          { key: 'region', value: 'apac' },
          { key: 'tier', value: '1' },
        ],
      }),
    );
    expect(screen.getByText('region=apac · tier=1')).toBeInTheDocument();
  });
});

const TWO_ENTRIES = [
  { key: 'region', value: 'apac' },
  { key: 'tier', value: '1' },
];

describe('MetadataEditor — editable', () => {
  it('updates only the changed entry\'s key, leaving the other entry untouched', () => {
    const onChange = vi.fn();
    render(createElement(MetadataEditor, { entries: TWO_ENTRIES, onChange }));
    const [firstKeyInput] = screen.getAllByPlaceholderText('key');
    fireEvent.change(firstKeyInput, { target: { value: 'zone' } });
    expect(onChange).toHaveBeenCalledWith([
      { key: 'zone', value: 'apac' },
      { key: 'tier', value: '1' },
    ]);
  });

  it("updates only the changed entry's value", () => {
    const onChange = vi.fn();
    render(createElement(MetadataEditor, { entries: TWO_ENTRIES, onChange }));
    const [firstValueInput] = screen.getAllByPlaceholderText('value');
    fireEvent.change(firstValueInput, { target: { value: 'emea' } });
    expect(onChange).toHaveBeenCalledWith([
      { key: 'region', value: 'emea' },
      { key: 'tier', value: '1' },
    ]);
  });

  it('removes only the targeted entry, keeping the other one', () => {
    const onChange = vi.fn();
    render(createElement(MetadataEditor, { entries: TWO_ENTRIES, onChange }));
    screen.getAllByRole('button', { name: 'Remove' })[0].click();
    expect(onChange).toHaveBeenCalledWith([{ key: 'tier', value: '1' }]);
  });

  it('adds a blank entry', () => {
    const onChange = vi.fn();
    render(createElement(MetadataEditor, { entries: [], onChange }));
    screen.getByRole('button', { name: 'Add entry' }).click();
    expect(onChange).toHaveBeenCalledWith([{ key: '', value: '' }]);
  });

  it('does nothing (never throws) when onChange is not wired', () => {
    render(createElement(MetadataEditor, { entries: TWO_ENTRIES }));
    const [firstKeyInput] = screen.getAllByPlaceholderText('key');
    expect(() => fireEvent.change(firstKeyInput, { target: { value: 'zone' } })).not.toThrow();
    expect(() => screen.getAllByRole('button', { name: 'Remove' })[0].click()).not.toThrow();
    expect(() => screen.getByRole('button', { name: 'Add entry' }).click()).not.toThrow();
  });
});
