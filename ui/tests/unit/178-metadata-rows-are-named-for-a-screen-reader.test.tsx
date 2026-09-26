/**
 * DRK-1758 §5:
 *   @unit
 *   Scenario: Metadata rows are named for a screen reader
 *     Given a group's edit form holds metadata rows "region" and "desk"
 *     When a screen reader user moves through the rows
 *     Then each row's key field, value field and remove action are announced with that row's position
 *
 * Drives `MetadataEditor`, the metadata block of the group edit form (`AccountGroupsScreen`),
 * through its props. A control's accessible name is what a screen reader announces. The names
 * are the DRK-1763 brief §9 Q1 default: `Key, row <n>` · `Value, row <n>` · `Remove row <n>`.
 *
 * RED today: the inputs are named only by their placeholder and every remove button reads
 * "Remove" (`MetadataEditor.tsx:42-57`; DRK-1758 audit D3).
 */
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { MetadataEditor } from '@/components/forms/MetadataEditor';

test('Metadata rows are named for a screen reader', () => {
  // Given a group's edit form holds metadata rows "region" and "desk"
  render(
    <MetadataEditor
      entries={[
        { key: 'region', value: 'apac' },
        { key: 'desk', value: 'fx' },
      ]}
      onChange={() => undefined}
    />,
  );

  // When a screen reader user moves through the rows
  // Then each row's key field, value field and remove action are announced with that row's position
  expect(screen.getByRole('textbox', { name: 'Key, row 1' })).toHaveValue('region');
  expect(screen.getByRole('textbox', { name: 'Value, row 1' })).toHaveValue('apac');
  expect(screen.getByRole('button', { name: 'Remove row 1' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Key, row 2' })).toHaveValue('desk');
  expect(screen.getByRole('textbox', { name: 'Value, row 2' })).toHaveValue('fx');
  expect(screen.getByRole('button', { name: 'Remove row 2' })).toBeInTheDocument();
});
