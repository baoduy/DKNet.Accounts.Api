/**
 * DRK-1758 §5:
 *   @unit
 *   Scenario: Removing a metadata row keeps the cursor in place
 *     Given treasury-ops is typing in the value of row "desk"
 *     When row "region" above it is removed
 *     Then the cursor stays in the value of row "desk"
 *
 * Drives `MetadataEditor` the way the group edit form does: the rows live in the owner's state
 * and every change comes back through `onChange`. Row "region" is removed by its own remove
 * action, dispatched without moving the focus (`fireEvent.click`), so the only thing that can
 * move the cursor is the editor redrawing its rows. The remove actions are found by the start of
 * their name ("Remove", or "Remove row <n>" once the rows are named — scenario 178), region's
 * being the first.
 *
 * RED today: rows are keyed by their index (`MetadataEditor.tsx:43`), so removing the first row
 * redraws "desk" into the first row's inputs and drops the input the cursor was in.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type JSX } from 'react';
import { expect, test } from 'vitest';
import { MetadataEditor, type MetadataEntry } from '@/components/forms/MetadataEditor';

function GroupMetadata(): JSX.Element {
  const [entries, setEntries] = useState<MetadataEntry[]>([
    { key: 'region', value: 'apac' },
    { key: 'desk', value: 'fx' },
  ]);
  return <MetadataEditor entries={entries} onChange={setEntries} />;
}

test('Removing a metadata row keeps the cursor in place', async () => {
  const user = userEvent.setup();
  render(<GroupMetadata />);

  // Given treasury-ops is typing in the value of row "desk"
  await user.click(screen.getByDisplayValue('fx'));
  await user.keyboard('-spot');
  expect(screen.getByDisplayValue('fx-spot')).toHaveFocus();

  // When row "region" above it is removed
  const [removeRegion] = screen.getAllByRole('button', { name: /^Remove\b/ });
  fireEvent.click(removeRegion);
  expect(screen.queryByDisplayValue('region')).toBeNull();

  // Then the cursor stays in the value of row "desk"
  expect(screen.getByDisplayValue('fx-spot')).toHaveFocus();
});
