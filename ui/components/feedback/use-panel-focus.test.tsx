/**
 * DRK-1725 §3 row 8 — a side panel takes focus when it opens and gives it back to its opener when
 * it closes, without ever pulling focus away from where the operator moved on to.
 */
import { act, render, screen } from '@testing-library/react';
import { useState, type JSX } from 'react';
import { describe, expect, it } from 'vitest';
import { usePanelFocus } from './use-panel-focus';

/** `mounted`: the panel stays in the page while closed, so focus is still inside it when it closes. */
function Harness({ mounted = false }: { mounted?: boolean }): JSX.Element {
  const [open, setOpen] = useState(false);
  const panelRef = usePanelFocus<HTMLDivElement>(open);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <input aria-label="Elsewhere" />
      {open || mounted ? (
        <div ref={panelRef} tabIndex={-1} data-testid="panel">
          <button type="button" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      ) : null}
    </>
  );
}

describe('usePanelFocus', () => {
  it('moves focus into the panel when it opens', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    act(() => opener.click());
    expect(document.activeElement).toBe(screen.getByTestId('panel'));
  });

  it('gives focus back to the control that opened it when it closes from inside', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    act(() => opener.click());
    const close = screen.getByRole('button', { name: 'Close' });
    close.focus();
    act(() => close.click());
    expect(screen.queryByTestId('panel')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('leaves focus where the operator moved it when the panel closes', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    act(() => opener.click());
    const elsewhere = screen.getByLabelText('Elsewhere');
    elsewhere.focus();
    act(() => screen.getByRole('button', { name: 'Close' }).click());
    expect(document.activeElement).toBe(elsewhere);
  });

  it('gives focus back when the panel closes while focus is still inside it', () => {
    render(<Harness mounted />);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    act(() => opener.click());
    const close = screen.getByRole('button', { name: 'Close' });
    close.focus();
    act(() => close.click());
    expect(screen.getByTestId('panel')).toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });

  it('opens and closes without a panel to focus', () => {
    function Unattached(): JSX.Element {
      const [open, setOpen] = useState(false);
      usePanelFocus<HTMLDivElement>(open);
      return (
        <button type="button" onClick={() => setOpen((current) => !current)}>
          Toggle
        </button>
      );
    }
    render(<Unattached />);
    const toggle = screen.getByRole('button', { name: 'Toggle' });
    toggle.focus();
    act(() => toggle.click());
    expect(document.activeElement).toBe(toggle);
    act(() => toggle.click());
    expect(document.activeElement).toBe(toggle);
  });
});
