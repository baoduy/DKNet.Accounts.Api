import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement, useState, type JSX } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MetadataEditor, type MetadataEntry } from './MetadataEditor';

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
    screen.getByRole('button', { name: 'Remove row 1' }).click();
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
    expect(() => screen.getByRole('button', { name: 'Remove row 1' }).click()).not.toThrow();
    expect(() => screen.getByRole('button', { name: 'Add entry' }).click()).not.toThrow();
  });
});

describe('MetadataEditor — rows the owner swaps in (DRK-1760 §3 row 12)', () => {
  it('names every row by its position when the owner hands it more rows, or fewer', () => {
    const { rerender } = render(createElement(MetadataEditor, { entries: [{ key: 'region', value: 'apac' }], onChange: vi.fn() }));
    expect(screen.getAllByRole('textbox').map((input) => input.getAttribute('aria-label'))).toEqual(['Key, row 1', 'Value, row 1']);

    rerender(createElement(MetadataEditor, { entries: TWO_ENTRIES, onChange: vi.fn() }));
    expect(screen.getAllByRole('textbox').map((input) => input.getAttribute('aria-label'))).toEqual(['Key, row 1', 'Value, row 1', 'Key, row 2', 'Value, row 2']);
    expect(screen.getByRole('button', { name: 'Remove row 2' })).toBeInTheDocument();

    rerender(createElement(MetadataEditor, { entries: [], onChange: vi.fn() }));
    expect(screen.queryAllByRole('textbox')).toEqual([]);
  });
});

describe('MetadataEditor — an added row keeps its own place (DRK-1760 §3 row 12)', () => {
  function GroupMetadata(): JSX.Element {
    const [entries, setEntries] = useState<MetadataEntry[]>([{ key: 'region', value: 'apac' }]);
    return createElement(MetadataEditor, { entries, onChange: setEntries });
  }

  it('keeps the cursor in a row added here when a row above it is removed', async () => {
    const user = userEvent.setup();
    render(createElement(GroupMetadata));
    await user.click(screen.getByRole('button', { name: 'Add entry' }));
    await user.click(screen.getByRole('textbox', { name: 'Key, row 2' }));
    await user.keyboard('desk');

    fireEvent.click(screen.getByRole('button', { name: 'Remove row 1' }));

    expect(screen.getByDisplayValue('desk')).toHaveFocus();
  });
});
