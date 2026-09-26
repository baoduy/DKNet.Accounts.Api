/**
 * DRK-1758 §5:
 *   @unit
 *   Scenario: A button inside a form does not submit it unless marked
 *     Given a form holds an "Add entry" button that is not marked as the submit action
 *     When the button is pressed
 *     Then the form is not submitted
 *
 * Drives the console's `Button` primitive through its props. "Not marked as the submit action"
 * is a `Button` given no `type`.
 *
 * RED today: `Button` passes no default `type`, so the browser's own default (`submit`) applies
 * (`ui/button.tsx:34-37`; DRK-1758 audit, theme drift table).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { Button } from '@/components/ui/button';

test('A button inside a form does not submit it unless marked', async () => {
  const user = userEvent.setup();
  const submitted = vi.fn((event: SubmitEvent) => event.preventDefault());

  // Given a form holds an "Add entry" button that is not marked as the submit action
  render(
    <form aria-label="Metadata" onSubmit={(event) => submitted(event.nativeEvent as SubmitEvent)}>
      <Button>Add entry</Button>
    </form>,
  );

  // When the button is pressed
  await user.click(screen.getByRole('button', { name: 'Add entry' }));

  // Then the form is not submitted
  expect(submitted).not.toHaveBeenCalled();
});
