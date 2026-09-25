/**
 * DRK-1679 §5:
 *   Scenario Outline: Every colour pair is readable in both themes
 *     Given the theme <theme>
 *     When the console draws <pair>
 *     Then the contrast clears the floor the design system states
 *
 *     Examples:
 *       | theme | pair                          |
 *       | light | body text on a card           |
 *       | dark  | body text on a card           |
 *       | light | a status badge and its ground |
 *       | dark  | a status badge and its ground |
 *
 * No real screen draws a card or a status badge yet (the 16 ledger components are out of
 * scope for this slice), so this drives the seam DRK-1679 §3 row 12 allows: a harness route
 * mirroring `ui/app/a11y-harness-internal/page.tsx`. Every foreground/background pair
 * clears 4.5:1 in both themes (DRK-1679 §6 R4); floor also stated at
 * `Design/README.md:174-175`.
 *
 * Literal token values copied from Design/tokens/colors.css (source of truth, R2):
 *   light --card #ffffff / --card-foreground #0f172a
 *   dark  --card #0f172a / --card-foreground #f8fafc
 *   light --badge-neutral-bg #f1f5f9 / --badge-neutral-fg #334155
 *   dark  --badge-neutral-bg #1e293b / --badge-neutral-fg #cbd5e1
 */
import { expect, test } from '../support/test';

type Theme = 'light' | 'dark';

function parseRgb(rgb: string): [number, number, number] {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) throw new Error(`not an rgb() colour: ${rgb}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rl, gl, bl] = [r, g, b]
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const EXAMPLES: Array<{ theme: Theme; pair: string; testId: string }> = [
  { theme: 'light', pair: 'body text on a card', testId: 'card' },
  { theme: 'dark', pair: 'body text on a card', testId: 'card' },
  { theme: 'light', pair: 'a status badge and its ground', testId: 'status-badge' },
  { theme: 'dark', pair: 'a status badge and its ground', testId: 'status-badge' },
];

for (const { theme, pair, testId } of EXAMPLES) {
  test(`Every colour pair is readable in both themes: ${theme} — ${pair}`, async ({ page, baseURL }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto(`${baseURL}/frame-harness-internal`);

    const el = page.getByTestId(testId);
    await expect(el).toBeVisible();

    const [fg, bg] = await el.evaluate((node) => {
      const style = getComputedStyle(node);
      return [style.color, style.backgroundColor];
    });
    expect(contrastRatio(parseRgb(fg), parseRgb(bg))).toBeGreaterThanOrEqual(4.5);

    // Drawn on its new base controls: no hand-rolled inline `style` restating a token.
    await expect(el).not.toHaveAttribute('style', /.+/);
  });
}
