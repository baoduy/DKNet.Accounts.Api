/**
 * DRK-1725 §5 (the Overview row of the outline; the other screens' rows belong to the screen
 * states stage):
 *   @integration
 *   Scenario Outline: A list states three kinds of empty in three messages
 *     Given <situation>
 *     When the operator Mai opens the <screen>
 *     Then she reads "<message>"
 *
 *     Examples:
 *       | screen          | situation                    | message                            |
 *       | Overview screen | Mai has opened no record yet | Records you open will appear here. |
 *
 * RED today: `/` draws no recently viewed panel.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { panel } from '../support/overview';
import { signInAs } from '../support/sign-in';

test('A list states three kinds of empty in three messages — Overview screen', async ({ page, baseURL }) => {
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  await page.goto(`${baseURL}/`);

  const recent = panel(page, 'Recently viewed');
  await expect(recent.getByText('Records you open will appear here.', { exact: true })).toBeVisible();
  await expect(recent.getByRole('listitem')).toHaveCount(0);
});
