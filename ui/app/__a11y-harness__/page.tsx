import type { JSX } from 'react';

/**
 * Test-only fixture route: renders the four control patterns Design/README.md:180-206
 * names as needing an accessibility correction, so the acceptance scenario "The four
 * accessibility corrections ... are in force" can inspect them directly rather than
 * waiting on real screen content (out of scope for this ticket).
 */
export default function A11yHarnessPage(): JSX.Element {
  return (
    <div>
      <input data-testid="text-field" placeholder="Reference" style={{ border: '1px solid var(--border-control)' }} />
      <input data-testid="focus-field" style={{ border: '1px solid var(--border-control)' }} />
      <button data-testid="delete-button" style={{ background: 'var(--destructive-solid)', color: '#ffffff' }}>
        Delete
      </button>
      <table>
        <tbody>
          <tr data-testid="hovered-row" style={{ background: 'var(--surface-hover)' }}>
            <td>Hovered</td>
          </tr>
          <tr data-testid="selected-row" style={{ background: 'var(--surface-selected)' }}>
            <td>Selected</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
