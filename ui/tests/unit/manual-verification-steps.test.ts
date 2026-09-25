/**
 * DRK-1725 §5:
 *   @unit
 *   Scenario: The steps that cannot be automated are written down
 *     Given the repository at the end of this change
 *     When a person reads its manual verification steps
 *     Then they cover a real Microsoft Entra ID sign-in, recording and reversing with a real directory token, and signing out
 *     And each step states what the person should see
 *
 * The steps live in `docs/manual-verification.md` (brief DRK-1730 §3 row 6): exactly these three
 * `##` sections, in this order, each holding numbered steps, and every numbered step followed by
 * a line starting `You should see:`. RED until the Docs stage writes the file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const STEPS_FILE = path.resolve(fileURLToPath(import.meta.url), '../../../../docs/manual-verification.md');

const SECTIONS = ['Sign in with Microsoft Entra ID', 'Record and reverse a posting with a real directory token', 'Sign out'];

test('The steps that cannot be automated are written down', () => {
  expect(fs.existsSync(STEPS_FILE), 'docs/manual-verification.md').toBe(true);
  const lines = fs.readFileSync(STEPS_FILE, 'utf8').split('\n');

  const headings = lines.filter((line) => /^## /.test(line)).map((line) => line.slice(3).trim());
  expect(headings).toEqual(SECTIONS);

  const stepsPerSection: Record<string, number> = Object.fromEntries(SECTIONS.map((section) => [section, 0]));
  const stepsWithoutResult: string[] = [];
  let section = '';
  lines.forEach((line, index) => {
    if (/^## /.test(line)) section = line.slice(3).trim();
    if (!/^\d+\.\s/.test(line)) return;
    if (section in stepsPerSection) stepsPerSection[section] += 1;
    const next = lines.slice(index + 1).find((candidate) => candidate.trim() !== '');
    if (!next?.trim().startsWith('You should see:')) stepsWithoutResult.push(`line ${index + 1}: ${line}`);
  });

  expect(Object.entries(stepsPerSection).filter(([, steps]) => steps === 0), 'sections without a numbered step').toEqual([]);
  expect(stepsWithoutResult, 'steps not followed by what the person should see').toEqual([]);
});
