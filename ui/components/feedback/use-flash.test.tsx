import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { JSX } from 'react';
import { describe, expect, it } from 'vitest';
import { useFlash } from './use-flash';

function Screen(): JSX.Element {
  const flash = useFlash();
  return (
    <>
      <button type="button" onClick={() => flash.show({ title: 'Group created', text: 'Created TREASURY — Treasury.' })}>
        Create group
      </button>
      <span data-testid="flash-title">{flash.flash?.title ?? 'none'}</span>
      {flash.card}
    </>
  );
}

describe('useFlash (DRK-1760 §3 row 8)', () => {
  it('shows nothing until a write went through', () => {
    render(<Screen />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByTestId('flash-title')).toHaveTextContent(/^none$/);
  });

  it('shows the card titled for the write as a status live region, until it is dismissed', async () => {
    render(<Screen />);
    await userEvent.click(screen.getByRole('button', { name: 'Create group' }));

    const card = screen.getByRole('status');
    expect(card).toHaveTextContent('Group createdCreated TREASURY — Treasury.');
    expect(screen.getByTestId('flash-title')).toHaveTextContent(/^Group created$/);

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByTestId('flash-title')).toHaveTextContent(/^none$/);
  });
});
