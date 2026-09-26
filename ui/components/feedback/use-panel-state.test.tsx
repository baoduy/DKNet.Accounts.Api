import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type JSX } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DISCARD_RECORD, usePanelState, useReportDirty, type PanelStateOptions } from './use-panel-state';

/** A screen with one panel whose form reports its own dirtiness, closed by a button. */
function Screen({ options, onClosed }: { options?: PanelStateOptions; onClosed: () => void }): JSX.Element {
  const panel = usePanelState(options);
  return (
    <>
      <button type="button" onClick={() => panel.guard(onClosed)}>
        Close details
      </button>
      <Form onDirtyChange={panel.onDirtyChange} />
      {panel.dialog}
    </>
  );
}

function Form({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }): JSX.Element {
  const [name, setName] = useState('Acme');
  useReportDirty(name !== 'Acme', onDirtyChange);
  return <input aria-label="Name" value={name} onChange={(event) => setName(event.target.value)} />;
}

describe('usePanelState — the guarded close (DRK-1760 §3 row 7)', () => {
  it('closes at once when the form holds no unsent edit', async () => {
    const onClosed = vi.fn();
    render(<Screen onClosed={onClosed} />);

    await userEvent.click(screen.getByRole('button', { name: 'Close details' }));

    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('asks "Discard unsaved changes?" first when the form holds an unsent edit, and keeping editing closes nothing', async () => {
    const onClosed = vi.fn();
    render(<Screen onClosed={onClosed} />);
    await userEvent.type(screen.getByLabelText('Name'), ' treasury');

    await userEvent.click(screen.getByRole('button', { name: 'Close details' }));
    const dialog = screen.getByRole('dialog', { name: 'Discard unsaved changes?' });
    expect(dialog).toHaveTextContent('This form has edits that have not been sent. Closing the panel drops them.');
    expect(screen.getAllByRole('button', { name: /Keep editing|Discard changes/ }).map((button) => button.textContent)).toEqual(['Keep editing', 'Discard changes']);

    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onClosed).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Name')).toHaveValue('Acme treasury');
  });

  it('closes once discarding is confirmed, and asks nothing after that', async () => {
    const onClosed = vi.fn();
    render(<Screen onClosed={onClosed} />);
    await userEvent.type(screen.getByLabelText('Name'), ' treasury');
    await userEvent.click(screen.getByRole('button', { name: 'Close details' }));

    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(onClosed).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Close details' }));
    expect(onClosed).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it("uses the record form's own wording, its discard at the footer's far end", async () => {
    render(<Screen options={{ copy: DISCARD_RECORD }} onClosed={() => undefined} />);
    await userEvent.type(screen.getByLabelText('Name'), '!');
    await userEvent.click(screen.getByRole('button', { name: 'Close details' }));

    expect(screen.getByRole('dialog', { name: 'Discard unsent record?' })).toHaveTextContent(
      'This record has not been sent. Closing the panel drops it, and the idempotency key is discarded with it.',
    );
    expect(screen.getByRole('button', { name: 'Discard record' })).toHaveClass('ml-auto', 'bg-destructive-solid');
    expect(screen.getByRole('button', { name: 'Keep editing' })).not.toHaveClass('ml-auto');
  });
});

describe('usePanelState — mode and stated dirtiness', () => {
  it('starts in the mode given and switches with show', () => {
    const { result } = renderHook(() => usePanelState({ initialMode: 'view' }));
    expect(result.current.mode).toBe('view');

    act(() => result.current.show('edit'));
    expect(result.current.mode).toBe('edit');
    act(() => result.current.show(null));
    expect(result.current.mode).toBeNull();
  });

  it('asks only in create and edit mode when the screen states the form is dirty', () => {
    const next = vi.fn();
    const { result } = renderHook(() => usePanelState({ initialMode: 'view', dirty: true }));

    act(() => result.current.guard(next));
    expect(next).toHaveBeenCalledTimes(1);

    act(() => result.current.show('create'));
    act(() => result.current.guard(next));
    expect(next).toHaveBeenCalledTimes(1);

    act(() => result.current.show('view'));
    act(() => result.current.show('edit'));
    act(() => result.current.guard(next));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('drops a reported edit when the mode switches', () => {
    const next = vi.fn();
    const { result } = renderHook(() => usePanelState());
    act(() => result.current.onDirtyChange(true));

    act(() => result.current.show('view'));
    act(() => result.current.guard(next));

    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('useReportDirty', () => {
  it('reports each change, and that nothing is left once the form is gone', () => {
    const onDirtyChange = vi.fn();
    const { rerender, unmount } = renderHook(({ dirty }) => useReportDirty(dirty, onDirtyChange), { initialProps: { dirty: false } });
    rerender({ dirty: true });
    expect(onDirtyChange.mock.calls.map(([dirty]) => dirty)).toEqual([false, true]);

    unmount();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('never throws when nobody listens', () => {
    expect(() => renderHook(() => useReportDirty(true, undefined)).unmount()).not.toThrow();
  });
});
